import Image from "next/image";
import { cn } from "@/lib/utils";

/** Logo circular de Jairo Martínez JMC S.A.S. (sol, palma y alas). */
export function Logo({
  tamano = 40,
  className,
  decorativo = false,
}: {
  tamano?: number;
  className?: string;
  /** true cuando el nombre de la empresa ya aparece al lado (evita que el lector de pantalla lo repita). */
  decorativo?: boolean;
}) {
  return (
    <Image
      src="/logo-jmc.jpeg"
      alt={decorativo ? "" : "Logo Jairo Martínez JMC S.A.S."}
      width={tamano}
      height={tamano}
      priority
      className={cn("shrink-0 rounded-full border border-borde bg-white object-cover", className)}
    />
  );
}
