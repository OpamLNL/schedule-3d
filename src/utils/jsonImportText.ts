export function normalizeImportJsonText(text: string): string {
  let value = text.replace(/^\uFEFF/, '').trim()
  if (value.startsWith('```')) {
    value = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  }
  return value
}

export function parseImportJsonText(text: string, fileLabel?: string): unknown {
  const normalized = normalizeImportJsonText(text)
  if (!normalized) {
    throw new Error(
      fileLabel
        ? `Файл «${fileLabel}» порожній або не прочитався на телефоні. Спробуйте «Вставити JSON».`
        : 'Вставте текст JSON',
    )
  }

  try {
    return JSON.parse(normalized)
  } catch {
    if (normalized.startsWith('<!DOCTYPE') || normalized.startsWith('<html') || normalized.startsWith('<')) {
      throw new Error('Це HTML-сторінка, не JSON. Завантажте файл schedule-....json з компʼютера.')
    }
    throw new Error(
      fileLabel
        ? `Файл «${fileLabel}» не є коректним JSON. Відкрийте його в Блокноті на компʼютері і скопіюйте текст через «Вставити JSON».`
        : 'Текст не є коректним JSON',
    )
  }
}

export async function readImportFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  if (buffer.byteLength === 0) return ''

  let text = new TextDecoder('utf-8', { fatal: false }).decode(buffer).replace(/^\uFEFF/, '')
  if (!text.trim()) {
    text = new TextDecoder('utf-16le', { fatal: false }).decode(buffer).replace(/^\uFEFF/, '')
  }

  return normalizeImportJsonText(text)
}
