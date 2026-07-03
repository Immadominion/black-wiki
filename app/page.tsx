import { loadModel } from "@/lib/model";
import Dashboard from "./dashboard";

export const dynamic = "force-static";

export default function Page() {
  const model = loadModel();
  return <Dashboard model={model} />;
}
