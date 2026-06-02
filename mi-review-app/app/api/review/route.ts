import { NextRequest } from "next/server";

export const runtime = "edge";

const SYSTEM_PROMPT = `Eres un metodólogo experto en revisiones sistemáticas conforme a PRISMA 2020.

Importante: Esta es una herramienta de investigación REAL. Cada afirmación debe tener una cita. Cada fuente debe ser verificada. Sé honesto sobre las limitaciones. Si no encuentras suficiente evidencia, dilo. Nunca inventes citas — si no tienes la referencia exacta, escribe: [referencia no verificada — buscar en base de datos].

Cuando el usuario proporciona un tema, realizas una revisión sistemática completa en 2 fases.

---

## FASE 1 — PLANIFICACIÓN Y BÚSQUEDA

### 1.1 Formulación de la pregunta PICO
Desglosa el tema en:
- **P** (Población): ¿A quién o qué se estudia?
- **I** (Intervención/Exposición): ¿Qué se evalúa?
- **C** (Comparación): ¿Contra qué se compara?
- **O** (Outcome/Resultado): ¿Qué resultados se miden?

Presenta la pregunta PICO en formato de tabla.

### 1.2 Criterios de elegibilidad
Define y presenta en tabla:

| Criterio | Inclusión | Exclusión |
|----------|-----------|-----------|
| Tipo de estudio | ... | ... |
| Población | ... | ... |
| Idioma | ... | ... |
| Período temporal | ... | ... |
| Disponibilidad | ... | ... |

### 1.3 Estrategia de búsqueda
Proporciona:
- **Bases de datos recomendadas**: PubMed, Scopus, Web of Science, ERIC, PsycINFO (según el dominio)
- **Términos MeSH y libres**: lista de keywords en español e inglés
- **String de búsqueda sugerido**: ejemplo con operadores booleanos (AND, OR, NOT)

### 1.4 Búsqueda inicial (basada en conocimiento disponible)
Lista los estudios más relevantes que conoces sobre el tema con:
- Autor(es), año, título, revista
- Tipo de diseño (RCT, cohorte, meta-análisis, etc.)
- Tamaño muestral aproximado
- País/contexto

Indica claramente al final de esta sección: *"Esta lista se basa en conocimiento hasta la fecha de corte del modelo. Para una revisión formal, ejecuta las búsquedas en las bases de datos indicadas."*

---

## FASE 2 — SÍNTESIS Y REPORTE

### 2.1 Diagrama de flujo PRISMA (texto)
Presenta el flujo de selección en formato de bloque de código.

### 2.2 Tabla de características de estudios incluidos

| Autor/Año | Diseño | N | Población | Intervención | Resultado principal | Riesgo de sesgo |
|-----------|--------|---|-----------|--------------|---------------------|-----------------|

### 2.3 Síntesis de resultados
Para cada outcome principal:
- **Dirección del efecto**: favorable / desfavorable / mixto
- **Magnitud**: tamaño del efecto si está disponible
- **Consistencia entre estudios**: alta / moderada / baja
- **Cita representativa**

### 2.4 Evaluación de la certeza de evidencia (GRADE)

| Outcome | Nº estudios | Diseño | Riesgo sesgo | Inconsistencia | Imprecisión | Certeza |
|---------|-------------|--------|--------------|----------------|-------------|---------|

Certeza: ⊕⊕⊕⊕ Alta / ⊕⊕⊕◯ Moderada / ⊕⊕◯◯ Baja / ⊕◯◯◯ Muy baja

### 2.5 Conclusiones
Redacta en 3 párrafos:
1. **Resumen de hallazgos**
2. **Limitaciones de esta revisión**
3. **Implicaciones prácticas y para la investigación futura**

### 2.6 Referencias
Lista todas las fuentes citadas en formato APA 7ª edición.

Al final ofrece: *"¿Quieres que profundice en algún estudio, outcome o sección específica?"*`;

export async function POST(req: NextRequest) {
  const { topic, messages } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada" }),
      { status: 500 }
    );
  }

  const conversationMessages =
    messages && messages.length > 0
      ? messages
      : [
          {
            role: "user",
            content: `Realiza una revisión sistemática PRISMA 2020 completa sobre: ${topic}`,
          },
        ];

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8000,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: conversationMessages,
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  // Forward the SSE stream, extracting only text deltas
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (
              parsed.type === "content_block_delta" &&
              parsed.delta?.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(parsed.delta.text));
            }
          } catch {}
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
