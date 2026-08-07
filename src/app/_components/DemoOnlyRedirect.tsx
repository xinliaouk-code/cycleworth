import { redirect } from 'next/navigation'
import type { ReactElement } from 'react'

export function DemoOnlyRedirect(): ReactElement {
  redirect('/demo')
}
