"use client";

import { useRouter } from "next/navigation";
import { ColaboradorForm } from "@/components/colaboradores/colaborador-form";
import { useCreateColaborador } from "@/hooks/use-colaboradores";
import { useToast } from "@/hooks/use-toast";
import { ErrorPeticion, mensajeDeError } from "@/lib/api-cliente";
import type { ColaboradorInput } from "@/types/colaborador";

export default function PaginaNuevoColaborador() {
  const router = useRouter();
  const toast = useToast();
  const crear = useCreateColaborador();

  const guardar = async (datos: ColaboradorInput) => {
    try {
      const colaborador = await crear.mutateAsync(datos);
      toast.success("Colaborador creado", { descripcion: `${colaborador.nombres} ${colaborador.apellidos}` });
      router.push(`/admin/colaboradores/${colaborador.id}`);
    } catch (error) {
      toast.error("No fue posible crear el colaborador", { descripcion: mensajeDeError(error) });
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <ColaboradorForm
        onEnviar={guardar}
        enviando={crear.isPending}
        textoBoton="Crear colaborador"
        onCancelar={() => router.push("/admin/colaboradores")}
        erroresServidor={crear.error instanceof ErrorPeticion ? crear.error.detalles : undefined}
      />
    </div>
  );
}
