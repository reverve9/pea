'use client'

import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import {
  MasterDetailProvider,
  MasterDetailList,
  MasterDetailDetail,
} from '@/components/shell/MasterDetail'

// 커뮤니티 자리표시자. master-detail 셸을 빈 상태로 배선해 골격이 서는지 확인.
// 실제 데이터(notices/faqs/inquiries/certificate_requests)는 후속 Phase 2b에서 바인딩.
type CommunityItem = { id: string }
const items: CommunityItem[] = [] // 2b 에서 채움

export default function CommunityPage() {
  return (
    <MasterDetailProvider>
      <AppShell
        main={
          <MasterDetailList<CommunityItem>
            items={items}
            getKey={(it) => it.id}
            header={<PageTitle title="COMMUNITY" subtitle="커뮤니티" />}
            renderCard={() => null}
            emptyLabel="준비 중입니다."
          />
        }
        extended={
          <MasterDetailDetail<CommunityItem>
            items={items}
            getKey={(it) => it.id}
            renderDetail={() => null}
          />
        }
      />
    </MasterDetailProvider>
  )
}
