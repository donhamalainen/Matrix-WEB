import { redirect } from "next/navigation";

// Juurireitti ohjaa aina sovelluksen pääsivulle (Tiimi).
// Middleware huolehtii kirjautumistarkistuksesta.
export default function Home() {
  redirect("/pelit");
}
