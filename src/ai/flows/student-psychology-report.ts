
'use server';
/**
 * @fileOverview Un agente de IA para redactar reportes psicológicos y conductuales.
 *
 * - generatePsychologyReport - Una función que maneja el proceso de redacción de reportes psicológicos.
 * - GeneratePsychologyReportInput - El tipo de entrada para la función generatePsychologyReport.
 * - GeneratePsychologyReportOutput - El tipo de retorno para la función generatePsychologyReport.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeneratePsychologyReportInputSchema = z.object({
  studentName: z.string().describe('El nombre del estudiante.'),
  gradeLevel: z.string().describe('El grado escolar del estudiante.'),
  observations: z.string().describe('Notas u observaciones clave sobre la conducta o situación del alumno.'),
  tone: z.enum(['profesional', 'empático', 'directo']).default('profesional').describe('El tono del reporte.'),
});
export type GeneratePsychologyReportInput = z.infer<typeof GeneratePsychologyReportInputSchema>;

const GeneratePsychologyReportOutputSchema = z.object({
  reportDraft: z.string().describe('El borrador estructurado del reporte psicológico.'),
});
export type GeneratePsychologyReportOutput = z.infer<typeof GeneratePsychologyReportOutputSchema>;

export async function generatePsychologyReport(input: GeneratePsychologyReportInput): Promise<GeneratePsychologyReportOutput> {
  return generatePsychologyReportFlow(input);
}

const generatePsychologyReportPrompt = ai.definePrompt({
  name: 'generatePsychologyReportPrompt',
  input: { schema: GeneratePsychologyReportInputSchema },
  output: { schema: GeneratePsychologyReportOutputSchema },
  system: `Eres un psicólogo educativo experto en redacción de reportes escolares. 
Tu tarea es transformar observaciones crudas en un reporte estructurado, profesional y útil para el expediente del alumno.
El reporte debe incluir secciones como: Antecedentes/Motivo, Observaciones Conductuales, Análisis y Recomendaciones.`,
  prompt: `Genera un reporte psicológico estructurado para el siguiente estudiante:

Nombre: {{studentName}}
Grado: {{gradeLevel}}
Observaciones: {{observations}}
Tono solicitado: {{tone}}

El reporte debe ser redactado en español formal y seguir esta estructura:
1. Resumen de la Situación.
2. Descripción de Conductas Observadas.
3. Posibles Factores (si aplica).
4. Sugerencias para el aula y el hogar.

Asegúrate de que el lenguaje sea constructivo y ético.
`
});

const generatePsychologyReportFlow = ai.defineFlow(
  {
    name: 'generatePsychologyReportFlow',
    inputSchema: GeneratePsychologyReportInputSchema,
    outputSchema: GeneratePsychologyReportOutputSchema,
  },
  async (input) => {
    const { output } = await generatePsychologyReportPrompt(input);
    return output!;
  }
);
