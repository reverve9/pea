// sms_notifications 저장 포트 — Supabase(service_role). 조건부 갱신으로 늦은 결과·동시 재발송을 막는다.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SmsLog, SmsStore } from './types'

const TABLE = 'sms_notifications'

export function createSupabaseSmsStore(db: SupabaseClient): SmsStore {
  return {
    async insert(row) {
      const { data, error } = await db.from(TABLE).insert(row).select('*').single()
      if (error) {
        if (error.code === '23505') return { kind: 'duplicate' }
        return { kind: 'error', error: error.code || 'insert_failed' }
      }
      return { kind: 'inserted', row: data as SmsLog }
    },
    async get(id) {
      const { data, error } = await db.from(TABLE).select('*').eq('id', id).maybeSingle()
      if (error) throw new Error(error.code || 'select_failed')
      return (data as SmsLog | null) ?? null
    },
    async update(id, expect, patch) {
      const { data, error } = await db
        .from(TABLE)
        .update(patch)
        .eq('id', id)
        .in('status', expect.status)
        .eq('attempts', expect.attempts)
        .select('*')
      if (error) throw new Error(error.code || 'update_failed')
      return ((data as SmsLog[] | null) ?? [])[0] ?? null
    },
  }
}
