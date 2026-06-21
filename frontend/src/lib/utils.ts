export const fmt = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const fmtDate = (date: string) =>
  new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')

export const fmtMonth = (month: string) => {
  const [y, m] = month.split('-')
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${months[parseInt(m) - 1]}/${y}`
}

export const currentMonth = () => new Date().toISOString().slice(0, 7)

export const cn = (...classes: (string | undefined | false | null)[]) =>
  classes.filter(Boolean).join(' ')

export const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0
