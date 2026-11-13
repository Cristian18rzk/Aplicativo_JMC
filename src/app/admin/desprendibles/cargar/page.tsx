"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CargueMasivo } from "@/components/desprendibles/cargue-masivo";

export default function PaginaCargueMasivo() {
  return (
    <div className="space-y-4">
      <Link href="/admin/desprendibles" className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-acento">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a desprendibles
      </Link>
      <CargueMasivo />
    </div>
  );
}
