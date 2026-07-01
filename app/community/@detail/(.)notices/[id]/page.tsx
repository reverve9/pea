import DetailContainer from '@/components/shell/DetailContainer'
import NoticeDetail from '@/components/features/NoticeDetail'
import { EmptyState } from '@/components/common/StateView'
import { getNoticeById } from '@/lib/queries.server'

// Intercepting Route: in-app 클릭 시 풀 네비 없이 상세를 페인/시트로 인터셉트.
// 서버에서 notice fetch → 반응형 DetailContainer(데스크탑 인라인 / 모바일 드로어)에 담는다.
export default async function InterceptedNoticePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const notice = await getNoticeById(id)
  return (
    <DetailContainer>
      {notice ? (
        <NoticeDetail notice={notice} />
      ) : (
        <EmptyState label="공지를 찾을 수 없습니다." />
      )}
    </DetailContainer>
  )
}
