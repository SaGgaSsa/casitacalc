"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConstructionSystem, RoofType, OpeningType, HouseInputSchema } from "@casitacalc/shared";
import type { HouseInput } from "@casitacalc/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";

const SISTEMA_LABELS: Record<HouseInput["sistemaConstructivo"], string> = {
  LADRILLO_HUECO: "Tradicional — ladrillo hueco",
};

const TECHO_LABELS: Record<HouseInput["tipoTecho"], string> = {
  CHAPA: "Chapa",
  LOSA: "Losa",
};

const ABERTURA_LABELS: Record<keyof typeof OpeningType | string, string> = {
  PUERTA: "Puerta",
  VENTANA: "Ventana",
};

interface ProjectFormProps {
  defaultValues: HouseInput;
  submitLabel: string;
  onSubmit: (values: HouseInput) => Promise<void>;
}

export function ProjectForm({ defaultValues, submitLabel, onSubmit }: ProjectFormProps) {
  const form = useForm<HouseInput>({
    resolver: zodResolver(HouseInputSchema),
    defaultValues,
  });
  const { register, handleSubmit, control, watch, setValue, formState } = form;
  const { errors, isSubmitting } = formState;

  const aberturas = useFieldArray({ control, name: "aberturas" });
  const tipoTecho = watch("tipoTecho");

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
      className="flex flex-col gap-6"
    >
      {/* Datos generales */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Datos de la vivienda
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field className="md:col-span-3">
            <FieldLabel htmlFor="nombreProyecto">Nombre del proyecto</FieldLabel>
            <Input id="nombreProyecto" placeholder="Ej: Casa propia" {...register("nombreProyecto")} />
            <FieldError>{errors.nombreProyecto?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="anchoM">Ancho (m)</FieldLabel>
            <Input
              id="anchoM"
              type="number"
              step="0.1"
              min="0"
              {...register("anchoM", { valueAsNumber: true })}
            />
            <FieldError>{errors.anchoM?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="largoM">Largo (m)</FieldLabel>
            <Input
              id="largoM"
              type="number"
              step="0.1"
              min="0"
              {...register("largoM", { valueAsNumber: true })}
            />
            <FieldError>{errors.largoM?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="alturaParedesM">Altura de paredes (m)</FieldLabel>
            <Input
              id="alturaParedesM"
              type="number"
              step="0.05"
              min="0"
              {...register("alturaParedesM", { valueAsNumber: true })}
            />
            <FieldDescription>Ej.: 2.70</FieldDescription>
            <FieldError>{errors.alturaParedesM?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Sistema constructivo</FieldLabel>
            <Select
              value={watch("sistemaConstructivo")}
              onValueChange={(v) =>
                setValue("sistemaConstructivo", v as HouseInput["sistemaConstructivo"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccioná un sistema" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SISTEMA_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
                <SelectItem value="STEEL_FRAMING" disabled>
                  Steel framing (pronto)
                </SelectItem>
              </SelectContent>
            </Select>
            <FieldError>{errors.sistemaConstructivo?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Tipo de techo</FieldLabel>
            <Select
              value={tipoTecho}
              onValueChange={(v) => {
                const next = v as HouseInput["tipoTecho"];
                setValue("tipoTecho", next);
                if (next === RoofType.LOSA) setValue("anguloTechoGrados", 0);
                else setValue("anguloTechoGrados", 20);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccioná un techo" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TECHO_LABELS) as HouseInput["tipoTecho"][]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TECHO_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.tipoTecho?.message}</FieldError>
          </Field>

          {tipoTecho === RoofType.CHAPA && (
            <Field>
              <FieldLabel htmlFor="anguloTechoGrados">Inclinación del techo (°)</FieldLabel>
              <Input
                id="anguloTechoGrados"
                type="number"
                step="1"
                min="5"
                max="60"
                {...register("anguloTechoGrados", { valueAsNumber: true })}
              />
              <FieldDescription>Mínimo recomendado: 15°</FieldDescription>
              <FieldError>{errors.anguloTechoGrados?.message}</FieldError>
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="cantidadBanios">Cantidad de baños</FieldLabel>
            <Input
              id="cantidadBanios"
              type="number"
              step="1"
              min="0"
              max="10"
              {...register("cantidadBanios", { valueAsNumber: true })}
            />
            <FieldError>{errors.cantidadBanios?.message}</FieldError>
          </Field>
        </div>
      </section>

      {/* Aberturas */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-semibold text-foreground">
              Aberturas
            </h3>
            <p className="text-sm text-muted-foreground">
              Se descuentan del área de muro para el cálculo.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              aberturas.append({ tipo: "VENTANA", anchoM: 1.2, altoM: 1.1, cantidad: 1 })
            }
          >
            <Plus className="size-4" />
            Agregar
          </Button>
        </div>

        {aberturas.fields.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Tipo</TableHead>
                  <TableHead>Ancho (m)</TableHead>
                  <TableHead>Alto (m)</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead className="w-12" aria-label="Eliminar" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {aberturas.fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Select
                        value={watch(`aberturas.${index}.tipo`)}
                        onValueChange={(v) =>
                          setValue(
                            `aberturas.${index}.tipo`,
                            v as HouseInput["aberturas"][number]["tipo"],
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ABERTURA_LABELS) as string[]).map((t) => (
                            <SelectItem key={t} value={t}>
                              {ABERTURA_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        {...register(`aberturas.${index}.anchoM`, { valueAsNumber: true })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        {...register(`aberturas.${index}.altoM`, { valueAsNumber: true })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        {...register(`aberturas.${index}.cantidad`, { valueAsNumber: true })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Quitar abertura"
                        onClick={() => aberturas.remove(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {errors.aberturas?.root != null || errors.aberturas?.message ? (
          <p className="mt-2 text-sm text-destructive">{errors.aberturas?.message}</p>
        ) : null}
      </section>

      {formState.errors.root ? (
        <p className="text-sm text-destructive">{String(formState.errors.root.message)}</p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting} className="self-start uppercase">
        {isSubmitting ? "Procesando…" : submitLabel}
      </Button>
    </form>
  );
}
