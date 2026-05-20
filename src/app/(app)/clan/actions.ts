"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Luo uusi clan. Luoja lisätään automaattisesti owneriksi. */
export async function createClan(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const tag = String(formData.get("tag") ?? "")
    .trim()
    .toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  const isOpen = formData.get("open") === "on";

  if (!name || name.length < 2 || name.length > 30)
    return { error: "Nimi 2–30 merkkiä" };
  if (!tag || tag.length < 2 || tag.length > 6)
    return { error: "Tagi 2–6 merkkiä" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  // Tarkista ettei käyttäjä ole jo clanissa.
  const { data: existing } = await supabase
    .from("clan_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { error: "Olet jo clanissa. Poistu ensin nykyisestä." };

  // Luo clan.
  const { data: clan, error: clanErr } = await supabase
    .from("clans")
    .insert({ name, tag, description, owner_id: user.id, open: isOpen })
    .select("id")
    .single();

  if (clanErr) {
    if (clanErr.code === "23505")
      return { error: "Nimi tai tagi on jo käytössä" };
    return { error: clanErr.message };
  }

  // Lisää omistaja jäseneksi.
  await supabase
    .from("clan_members")
    .insert({ clan_id: clan.id, user_id: user.id, role: "owner" });

  revalidatePath("/clan");
  return { ok: true, clanId: clan.id };
}

/** Vaihda clanin avoin/suljettu -tila (vain omistaja). */
export async function toggleClanOpen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  const { data: membership } = await supabase
    .from("clan_members")
    .select("clan_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "owner")
    return { error: "Vain omistaja voi muuttaa asetuksia" };

  const { data: clan } = await supabase
    .from("clans")
    .select("id, open")
    .eq("id", membership.clan_id)
    .single();

  if (!clan) return { error: "Clania ei löydy" };

  const { error } = await supabase
    .from("clans")
    .update({ open: !clan.open })
    .eq("id", clan.id);

  if (error) return { error: error.message };
  revalidatePath("/clan");
  return { ok: true, open: !clan.open };
}

/** Liity olemassa olevaan claniin. */
export async function joinClan(clanId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  // Tarkista ettei ole jo jossain clanissa.
  const { data: existing } = await supabase
    .from("clan_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { error: "Olet jo clanissa. Poistu ensin nykyisestä." };

  // Hae clan ja tarkista onko avoin.
  const { data: clan } = await supabase
    .from("clans")
    .select("id, open")
    .eq("id", clanId)
    .single();

  if (!clan) return { error: "Clania ei löydy" };

  if (clan.open) {
    // Avoin → liity suoraan.
    const { error } = await supabase
      .from("clan_members")
      .insert({ clan_id: clanId, user_id: user.id, role: "member" });
    if (error) return { error: error.message };
    revalidatePath("/clan");
    return { ok: true, joined: true };
  }

  // Suljettu → luo liittymispyyntö.
  const { data: existingReq } = await supabase
    .from("clan_join_requests")
    .select("id, status")
    .eq("clan_id", clanId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingReq) {
    if (existingReq.status === "pending")
      return { error: "Pyyntösi odottaa jo hyväksyntää" };
    // Jos aiemmin hylätty, poista ja luo uusi.
    await supabase.from("clan_join_requests").delete().eq("id", existingReq.id);
  }

  const { error } = await supabase
    .from("clan_join_requests")
    .insert({ clan_id: clanId, user_id: user.id });

  if (error) return { error: error.message };
  revalidatePath("/clan");
  return { ok: true, joined: false, message: "Liittymispyyntö lähetetty!" };
}

/** Hyväksy liittymispyyntö (vain omistaja/admin). */
export async function acceptJoinRequest(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  const { data: req } = await supabase
    .from("clan_join_requests")
    .select("id, clan_id, user_id, status")
    .eq("id", requestId)
    .single();

  if (!req) return { error: "Pyyntöä ei löydy" };
  if (req.status !== "pending") return { error: "Pyyntö on jo käsitelty" };

  // Tarkista oikeus.
  const { data: myMembership } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", req.clan_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myMembership || myMembership.role === "member")
    return { error: "Vain omistaja/admin voi hyväksyä" };

  // Tarkista ettei pyytäjä ole jo clanissa.
  const { data: alreadyIn } = await supabase
    .from("clan_members")
    .select("id")
    .eq("user_id", req.user_id)
    .maybeSingle();

  if (alreadyIn) return { error: "Pelaaja on jo clanissa" };

  // Hyväksy.
  await supabase
    .from("clan_join_requests")
    .update({ status: "accepted" })
    .eq("id", requestId);

  const { error } = await supabase
    .from("clan_members")
    .insert({ clan_id: req.clan_id, user_id: req.user_id, role: "member" });

  if (error) return { error: error.message };
  revalidatePath("/clan");
  return { ok: true };
}

/** Hylkää liittymispyyntö (vain omistaja/admin). */
export async function declineJoinRequest(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  const { data: req } = await supabase
    .from("clan_join_requests")
    .select("id, clan_id, status")
    .eq("id", requestId)
    .single();

  if (!req) return { error: "Pyyntöä ei löydy" };
  if (req.status !== "pending") return { error: "Pyyntö on jo käsitelty" };

  const { data: myMembership } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", req.clan_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myMembership || myMembership.role === "member")
    return { error: "Vain omistaja/admin voi hylätä" };

  await supabase
    .from("clan_join_requests")
    .update({ status: "declined" })
    .eq("id", requestId);

  revalidatePath("/clan");
  return { ok: true };
}

/** Poistu clanista. Jos omistaja, clan poistetaan. */
export async function leaveClan() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  // Onko omistaja?
  const { data: membership } = await supabase
    .from("clan_members")
    .select("id, clan_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { error: "Et ole clanissa" };

  if (membership.role === "owner") {
    // Poista koko clan (cascade poistaa jäsenet).
    await supabase.from("clans").delete().eq("id", membership.clan_id);
  } else {
    await supabase.from("clan_members").delete().eq("id", membership.id);
  }

  revalidatePath("/clan");
  return { ok: true };
}

/** Poista jäsen clanista (vain omistaja). */
export async function kickMember(memberId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  // Tarkista omistajuus.
  const { data: member } = await supabase
    .from("clan_members")
    .select("id, clan_id, user_id")
    .eq("id", memberId)
    .single();

  if (!member) return { error: "Jäsentä ei löydy" };
  if (member.user_id === user.id) return { error: "Et voi poistaa itseäsi" };

  const { data: clan } = await supabase
    .from("clans")
    .select("owner_id")
    .eq("id", member.clan_id)
    .single();

  if (!clan || clan.owner_id !== user.id)
    return { error: "Vain omistaja voi poistaa jäseniä" };

  const { error } = await supabase
    .from("clan_members")
    .delete()
    .eq("id", memberId);

  if (error) return { error: error.message };
  revalidatePath("/clan");
  return { ok: true };
}

/** Kutsu pelaaja claniin nimimerkin perusteella (vain omistaja/admin). */
export async function inviteToClan(nickname: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  // Tarkista oma jäsenyys ja rooli.
  const { data: myMembership } = await supabase
    .from("clan_members")
    .select("clan_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myMembership) return { error: "Et ole clanissa" };
  if (myMembership.role === "member")
    return { error: "Vain omistaja tai admin voi kutsua" };

  // Hae kutsuttava pelaaja nimimerkillä.
  const trimmed = nickname.trim().replace(/^@/, "");
  if (!trimmed) return { error: "Anna nimimerkki" };

  const { data: target } = await supabase
    .from("users")
    .select("id, nickname")
    .ilike("nickname", trimmed)
    .maybeSingle();

  if (!target) return { error: `Pelaajaa @${trimmed} ei löydy` };
  if (target.id === user.id) return { error: "Et voi kutsua itseäsi" };

  // Tarkista onko pelaaja jo jossain clanissa.
  const { data: existing } = await supabase
    .from("clan_members")
    .select("id")
    .eq("user_id", target.id)
    .maybeSingle();

  if (existing) return { error: `@${target.nickname} on jo clanissa` };

  // Tarkista onko kutsu jo lähetetty.
  const { data: existingInvite } = await supabase
    .from("clan_invites")
    .select("id, status")
    .eq("clan_id", myMembership.clan_id)
    .eq("invited_user_id", target.id)
    .maybeSingle();

  if (existingInvite) {
    if (existingInvite.status === "pending")
      return { error: `@${target.nickname} on jo kutsuttu` };
    // Jos aiemmin hylätty, poista vanha ja luo uusi.
    await supabase.from("clan_invites").delete().eq("id", existingInvite.id);
  }

  // Luo kutsu.
  const { error } = await supabase.from("clan_invites").insert({
    clan_id: myMembership.clan_id,
    invited_user_id: target.id,
    invited_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/clan");
  return { ok: true, nickname: target.nickname };
}

/** Hyväksy kutsu claniin. */
export async function acceptInvite(inviteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  // Hae kutsu.
  const { data: invite } = await supabase
    .from("clan_invites")
    .select("id, clan_id, invited_user_id, status")
    .eq("id", inviteId)
    .single();

  if (!invite) return { error: "Kutsua ei löydy" };
  if (invite.invited_user_id !== user.id)
    return { error: "Tämä ei ole sinun kutsusi" };
  if (invite.status !== "pending") return { error: "Kutsu on jo käsitelty" };

  // Tarkista ettei ole jo clanissa.
  const { data: existing } = await supabase
    .from("clan_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { error: "Olet jo clanissa. Poistu ensin nykyisestä." };

  // Merkitse kutsu hyväksytyksi.
  await supabase
    .from("clan_invites")
    .update({ status: "accepted" })
    .eq("id", inviteId);

  // Lisää jäseneksi.
  const { error } = await supabase
    .from("clan_members")
    .insert({ clan_id: invite.clan_id, user_id: user.id, role: "member" });

  if (error) return { error: error.message };
  revalidatePath("/clan");
  return { ok: true };
}

/** Hylkää kutsu claniin. */
export async function declineInvite(inviteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ei kirjautunut" };

  const { data: invite } = await supabase
    .from("clan_invites")
    .select("id, invited_user_id, status")
    .eq("id", inviteId)
    .single();

  if (!invite) return { error: "Kutsua ei löydy" };
  if (invite.invited_user_id !== user.id)
    return { error: "Tämä ei ole sinun kutsusi" };
  if (invite.status !== "pending") return { error: "Kutsu on jo käsitelty" };

  await supabase
    .from("clan_invites")
    .update({ status: "declined" })
    .eq("id", inviteId);

  revalidatePath("/clan");
  return { ok: true };
}
