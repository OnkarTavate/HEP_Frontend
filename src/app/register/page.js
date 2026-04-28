import { Suspense } from "react";
import RegisterContent from "./RegisterContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
