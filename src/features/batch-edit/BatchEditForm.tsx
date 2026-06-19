import React from "react";
import { PhotoEditSchema } from "@/schemas/photo";
import { AutoForm } from "@/components/form/AutoForm";

export function BatchEditForm({ formState, handleUpdateForm }: any) {
  
  return (
    <div className="flex-1 overflow-y-auto w-full p-6">
       <AutoForm
          schema={PhotoEditSchema}
          defaultValues={formState}
          onSubmit={async (data) => {
             // In batch edit mode we collect changes but save through a separate sync trigger in header.
             // We'll update the global store via handleUpdateForm for now to maintain compat.
             handleUpdateForm(data);
          }}
       />
       <div className="mt-8 text-xs text-slate-400">
         * Note: AutoForm is handling real-time editing. Submit to stage your batch change properties.
       </div>
    </div>
  );
}
