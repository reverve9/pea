-- 18_dummy_applications_v3.sql — 요청관리 해체·수정요청 정형화·요금엣지 검증용 더미.
--   직무 5(SCT) + 자율 10(SFP). 기존 더미 전체 삭제 후 재삽입. 재실행 안전(맨 위 DELETE). Supabase SQL editor 1회.
--
-- 커버 엣지(신규):
--   · 상태: pending / paid / completed / cancelled / refunded(전액)
--   · 부분환불: paid + refunded_amount>0 (status 유지) → 정산 자동 차감
--   · 추가결제: paid + due_amount>0 → 마이 '입금대기(추가)'
--   · 입금확인요청: 일치 / 불일치(payer_mismatch)
--   · 예비: is_waitlisted=true
--   · 환불요청: origin='user'(고객) / origin='modification'(수정 감액 자동, amount)
--   · 수정요청 정형: pending(변경항목) / completed(admin_reply) / rejected
--   · 요금연결 수정: 직무 렌탈 토글 pending 수정요청 → 반영 시 추가결제 라우팅 검증
--
-- 렌탈가(price_items): 의류30000 · 고글20000 · 보호대20000 · 장갑15000 / 직무기본 303000.
-- birth_back_enc = NULL(로컬 암호화 불가). 보험희망은 insurance_wanted 플래그로만 표현.

-- ── 0) 기존 더미 삭제 (참가자=FK CASCADE, 요청=phone으로 별도 삭제) ──
DELETE FROM refund_requests       WHERE phone LIKE '0101111%' OR phone LIKE '0102222%';
DELETE FROM modification_requests WHERE phone LIKE '0101111%' OR phone LIKE '0102222%';
DELETE FROM applications WHERE application_no LIKE 'PEA-%'
  OR application_no LIKE 'SCT-27-%' OR application_no LIKE 'SFP-27-%';

-- ══════════════════════════════════════════════════════════════════════════════
-- 1) 직무연수(jikmu) 5건 — 대표 1인.
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO applications (id, application_no, session_id, phone, applicant_name, payer_name, room_type, total_amount, refunded_amount, due_amount, status, deposit_confirmed_at, special_notes, referral_source, privacy_agreed, privacy_agreed_at, marketing_opt_in, payment_claimed_at, payment_claim_name, created_at) VALUES
-- (1) paid · 풀렌탈(고글 미신청) · 입금신고 일치. → 수정요청(고글 추가) 대상 = 반영 시 추가결제.
('a1000000-0000-4000-8000-000000000001','SCT-27-00001',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110001','김민준',NULL,'private',368000,0,0,'paid',now()-interval '5 hours','풀렌탈',ARRAY['체육교육회 홈페이지'],true,now(),true,now()-interval '6 hours','김민준',now()-interval '10 hours'),
-- (2) paid · 고글만. → 환불요청(고객, requested) 대상.
('a1000000-0000-4000-8000-000000000002','SCT-27-00002',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110002','이서연',NULL,'group',323000,0,0,'paid',now()-interval '4 hours',NULL,ARRAY['학교 내 공문'],true,now(),false,NULL,NULL,now()-interval '9 hours'),
-- (3) completed · 의류+보호대.
('a1000000-0000-4000-8000-000000000003','SCT-27-00003',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110003','박도윤',NULL,'private',353000,0,0,'completed',now()-interval '20 hours','단체강습',ARRAY['지인 소개'],true,now(),true,NULL,NULL,now()-interval '30 hours'),
-- (4) refunded(전액환불) · refunded_amount=전액.
('a1000000-0000-4000-8000-000000000004','SCT-27-00004',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110004','최유진',NULL,'group',303000,303000,0,'refunded',now()-interval '48 hours','개인사정 취소',ARRAY['교육청 연수원 게시글'],true,now(),false,NULL,NULL,now()-interval '50 hours'),
-- (5) paid + due_amount(수정 반영으로 고글 추가 +20000 → 추가입금 대기) — 마이 입금대기(추가) 표시.
('a1000000-0000-4000-8000-000000000005','SCT-27-00005',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110005','정하늘',NULL,'private',353000,0,20000,'paid',now()-interval '3 hours','수정 반영(고글 추가)으로 추가입금 대기',ARRAY['지인 소개'],true,now(),true,NULL,NULL,now()-interval '7 hours');

INSERT INTO participants (id, application_id, name, gender, phone, lesson_level, rentals, birth_front, is_leader, sort_order, line_amount) VALUES
('aa000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','김민준','male','01011110001','ski_beginner','{"apparel":true,"apparel_size":"L","protector":true,"protector_size":"L","goggle":false,"glove":true,"glove_size":"M"}'::jsonb,'900101',true,0,368000),
(gen_random_uuid(),'a1000000-0000-4000-8000-000000000002','이서연','female','01011110002','board_basic','{"apparel":false,"protector":false,"goggle":true,"glove":false}'::jsonb,'880202',true,0,323000),
('aa000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000003','박도윤','male','01011110003','ski_adv','{"apparel":true,"apparel_size":"XL","protector":true,"protector_size":"M","goggle":false,"glove":false}'::jsonb,'920303',true,0,353000),
(gen_random_uuid(),'a1000000-0000-4000-8000-000000000004','최유진','female','01011110004','ski_beginner','{"apparel":false,"protector":false,"goggle":false,"glove":false}'::jsonb,'910404',true,0,303000),
('aa000000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000005','정하늘','male','01011110005','ski_beginner','{"apparel":true,"apparel_size":"M","protector":false,"goggle":true,"glove":false}'::jsonb,'930505',true,0,353000);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2) 자율패키지(jayul) 10건 — 대표 + 참가자 슬롯.
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO applications (id, application_no, session_id, phone, applicant_name, payer_name, pkg_size, total_amount, refunded_amount, due_amount, price_breakdown, status, is_waitlisted, deposit_confirmed_at, companion_memo, referral_source, privacy_agreed, privacy_agreed_at, marketing_opt_in, payment_claimed_at, payment_claim_name, created_at) VALUES
-- (1) pending · 1인 렌탈X.
('b1000000-0000-4000-8000-000000000001','SFP-27-00001',(SELECT id FROM sessions WHERE label='주중2박 1차수' LIMIT 1),'01022220001','강태호',NULL,1,437500,0,0,'{"kind":"jayul","meta":{"rental_qty":{"apparel":0,"goggle":0,"protector":0,"glove":0}}}'::jsonb,'pending',false,NULL,NULL,ARRAY['지인 소개'],true,now(),false,NULL,NULL,now()-interval '6 hours'),
-- (2) paid + 부분환불(refunded_amount 50000, status 유지) → 정산 순액 차감. 환불요청(수정연동, completed) 동반.
('b1000000-0000-4000-8000-000000000002','SFP-27-00002',(SELECT id FROM sessions WHERE label='주중2박 3차수' LIMIT 1),'01022220002','윤서아',NULL,3,892500,50000,0,'{"kind":"jayul","meta":{"rental_qty":{"apparel":2,"goggle":1,"protector":0,"glove":0}}}'::jsonb,'paid',false,now()-interval '20 hours','부분환불 반영건',ARRAY['체육교육회 홈페이지'],true,now(),false,NULL,NULL,now()-interval '24 hours'),
-- (3) completed · 5인.
('b1000000-0000-4000-8000-000000000003','SFP-27-00003',(SELECT id FROM sessions WHERE label='주말1박 1차수' LIMIT 1),'01022220003','한지훈',NULL,5,1045000,0,0,'{"kind":"jayul","meta":{"rental_qty":{"apparel":3,"goggle":1,"protector":2,"glove":1}}}'::jsonb,'completed',false,now()-interval '40 hours','가족 5인',ARRAY['학교 내 공문'],true,now(),false,NULL,NULL,now()-interval '48 hours'),
-- (4) pending + 예비(정원 초과 접수).
('b1000000-0000-4000-8000-000000000004','SFP-27-00004',(SELECT id FROM sessions WHERE label='주중2박 1차수' LIMIT 1),'01022220004','오예린',NULL,4,1120000,0,0,'{"kind":"jayul","meta":{"rental_qty":{"apparel":0,"goggle":0,"protector":0,"glove":0}}}'::jsonb,'pending',true,NULL,'정원 초과 예비 접수',ARRAY['지인 소개'],true,now(),true,now()-interval '1 hours','오예린',now()-interval '2 hours'),
-- (5) cancelled(취소).
('b1000000-0000-4000-8000-000000000005','SFP-27-00005',(SELECT id FROM sessions WHERE label='주말2박 1차수' LIMIT 1),'01022220005','신재원',NULL,2,700000,0,0,'{"kind":"jayul","meta":{"rental_qty":{"apparel":0,"goggle":0,"protector":0,"glove":0}}}'::jsonb,'cancelled',false,NULL,'고객 취소',ARRAY['과거 참가자'],true,now(),false,NULL,NULL,now()-interval '30 hours'),
-- (6) paid · 입금신고 불일치(payer_mismatch — 입금자명≠신청자명).
('b1000000-0000-4000-8000-000000000006','SFP-27-00006',(SELECT id FROM sessions WHERE label='주말2박 2차수' LIMIT 1),'01022220006','배소율','다른입금자',3,850000,0,0,'{"kind":"jayul","meta":{"rental_qty":{"apparel":1,"goggle":0,"protector":0,"glove":0}}}'::jsonb,'pending',false,NULL,'입금자명 불일치 대조',ARRAY['지인 소개'],true,now(),false,now()-interval '40 minutes','다른입금자',now()-interval '2 hours'),
-- (7) pending · 수정요청 completed(처리완료·admin_reply) 대상.
('b1000000-0000-4000-8000-000000000007','SFP-27-00007',(SELECT id FROM sessions WHERE label='주중2박 2차수' LIMIT 1),'01022220007','임준서',NULL,2,665000,0,0,'{"kind":"jayul","meta":{"rental_qty":{"apparel":0,"goggle":0,"protector":0,"glove":0}}}'::jsonb,'paid',false,now()-interval '10 hours','연락처 수정 반영됨',ARRAY['체육교육회 홈페이지'],true,now(),false,NULL,NULL,now()-interval '12 hours'),
-- (8) pending · 수정요청 rejected(반려) 대상.
('b1000000-0000-4000-8000-000000000008','SFP-27-00008',(SELECT id FROM sessions WHERE label='주중2박 2차수' LIMIT 1),'01022220008','문가온',NULL,2,665000,0,0,'{"kind":"jayul","meta":{"rental_qty":{"apparel":0,"goggle":0,"protector":0,"glove":0}}}'::jsonb,'pending',false,NULL,'수정요청 반려 대상',ARRAY['지인 소개'],true,now(),false,NULL,NULL,now()-interval '5 hours'),
-- (9) paid · 환불요청(수정연동 pending, 45000 확정 대기) 대상. refunded_amount 아직 0.
('b1000000-0000-4000-8000-000000000009','SFP-27-00009',(SELECT id FROM sessions WHERE label='주말1박 2차수' LIMIT 1),'01022220009','서다인',NULL,2,620000,0,0,'{"kind":"jayul","meta":{"rental_qty":{"apparel":1,"goggle":0,"protector":0,"glove":0}}}'::jsonb,'paid',false,now()-interval '8 hours','부분환불 확정 대기',ARRAY['과거 참가자'],true,now(),false,NULL,NULL,now()-interval '10 hours'),
-- (10) pending · 3인 보험만.
('b1000000-0000-4000-8000-000000000010','SFP-27-00010',(SELECT id FROM sessions WHERE label='주말2박 1차수' LIMIT 1),'01022220010','홍시우',NULL,3,850000,0,0,'{"kind":"jayul","meta":{"rental_qty":{"apparel":0,"goggle":0,"protector":0,"glove":0}}}'::jsonb,'pending',false,NULL,'보험만 희망',ARRAY['지인 소개'],true,now(),true,now()-interval '1 hours','홍시우',now()-interval '1 hours');

INSERT INTO participants (id, application_id, name, gender, phone, lesson_level, rentals, birth_front, is_leader, sort_order, line_amount) VALUES
(gen_random_uuid(),'b1000000-0000-4000-8000-000000000001','강태호','male','01022220001','jayul_freeride','{"equipment":"ski","apparel":false,"protector":false,"goggle":false,"glove":false}'::jsonb,'950601',true,0,437500),
(gen_random_uuid(),'b1000000-0000-4000-8000-000000000002','윤서아','female','01022220002','jayul_ski','{"equipment":"ski","apparel":true,"apparel_size":"M","goggle":true}'::jsonb,'930712',true,0,892500),
(gen_random_uuid(),'b1000000-0000-4000-8000-000000000002','참가자 2',NULL,NULL,NULL,'{}'::jsonb,NULL,false,1,0),
(gen_random_uuid(),'b1000000-0000-4000-8000-000000000002','참가자 3',NULL,NULL,NULL,'{}'::jsonb,NULL,false,2,0),
(gen_random_uuid(),'b1000000-0000-4000-8000-000000000003','한지훈','male','01022220003','jayul_ski','{"equipment":"ski","apparel":true,"apparel_size":"L","protector":true,"protector_size":"M","glove":true,"glove_size":"M"}'::jsonb,'910815',true,0,1045000),
(gen_random_uuid(),'b1000000-0000-4000-8000-000000000004','오예린','female','01022220004','jayul_freeride','{"equipment":"board"}'::jsonb,'940920',true,0,1120000),
(gen_random_uuid(),'b1000000-0000-4000-8000-000000000005','신재원','male','01022220005','jayul_ski','{"equipment":"ski"}'::jsonb,'960112',true,0,700000),
(gen_random_uuid(),'b1000000-0000-4000-8000-000000000006','배소율','female','01022220006','jayul_ski','{"equipment":"ski","apparel":true,"apparel_size":"S"}'::jsonb,'970207',true,0,850000),
('aa000000-0000-4000-8000-000000000007','b1000000-0000-4000-8000-000000000007','임준서','male','01022220007','jayul_ski','{"equipment":"ski"}'::jsonb,'900303',true,0,665000),
('aa000000-0000-4000-8000-000000000008','b1000000-0000-4000-8000-000000000008','문가온','female','01022220008','jayul_ski','{"equipment":"ski"}'::jsonb,'910404',true,0,665000),
(gen_random_uuid(),'b1000000-0000-4000-8000-000000000009','서다인','female','01022220009','jayul_ski','{"equipment":"ski","apparel":true,"apparel_size":"M"}'::jsonb,'920505',true,0,620000),
(gen_random_uuid(),'b1000000-0000-4000-8000-000000000010','홍시우','male','01022220010','jayul_freeride','{"equipment":"ski","insurance_wanted":true}'::jsonb,'930606',true,0,850000);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3) 환불요청(refund_requests) — 고객(user) / 수정연동(modification) / 확정대기·완료.
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO refund_requests (application_id, phone, reason, refund_account, amount, origin, status, created_at) VALUES
-- 고객 환불요청(SCT-00002 paid) — 확정 대기.
('a1000000-0000-4000-8000-000000000002','01011110002','개인 사정으로 참석이 어렵습니다.','국민 123456-78-901234 이서연',NULL,'user','requested',now()-interval '2 hours'),
-- 수정 감액 자동생성(SFP-00009) — 부분환불 45000 확정 대기.
('b1000000-0000-4000-8000-000000000009','01022220009','수정 반영에 따른 부분환불',NULL,45000,'modification','requested',now()-interval '3 hours'),
-- 수정 감액 자동생성(SFP-00002) — 이미 환불완료(부분환불 50000 반영됨).
('b1000000-0000-4000-8000-000000000002','01022220002','수정 반영에 따른 부분환불',NULL,50000,'modification','completed',now()-interval '19 hours');

-- ══════════════════════════════════════════════════════════════════════════════
-- 4) 수정요청(modification_requests) — 정형 changes. pending(요금연결) / completed / rejected.
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO modification_requests (application_id, phone, changes, user_note, status, admin_reply, created_at) VALUES
-- pending · 직무 렌탈 고글 추가(false→true) = 반영 시 +20000 추가결제 라우팅 검증(SCT-00001).
('a1000000-0000-4000-8000-000000000001','01011110001',
 '[{"target":"participant","participant_id":"aa000000-0000-4000-8000-000000000001","participant_name":"김민준","field":"rental_goggle","label":"렌탈·고글","current":"false","requested":"true"}]'::jsonb,
 '고글도 추가로 대여하고 싶어요.','pending',NULL,now()-interval '1 hours'),
-- pending · 인적정보만(연락처+성별) = 요금 무관 반영(SCT-00003는 completed라 미입금 아님; 정보성 반영 검증).
('a1000000-0000-4000-8000-000000000003','01011110003',
 '[{"target":"participant","participant_id":"aa000000-0000-4000-8000-000000000003","participant_name":"박도윤","field":"phone","label":"연락처","current":"01011110003","requested":"01099998888"}]'::jsonb,
 NULL,'pending',NULL,now()-interval '90 minutes'),
-- completed · 처리완료 + admin_reply(SFP-00007 임준서 연락처 변경).
('b1000000-0000-4000-8000-000000000007','01022220007',
 '[{"target":"participant","participant_id":"aa000000-0000-4000-8000-000000000007","participant_name":"임준서","field":"phone","label":"연락처","current":"01022220007","requested":"01077776666"}]'::jsonb,
 '연락처가 바뀌었습니다.','completed','요청하신 연락처 변경을 반영했습니다.',now()-interval '9 hours'),
-- rejected · 반려(SFP-00008).
('b1000000-0000-4000-8000-000000000008','01022220008',
 '[{"target":"participant","participant_id":"aa000000-0000-4000-8000-000000000008","participant_name":"문가온","field":"name","label":"성함","current":"문가온","requested":"문가온A"}]'::jsonb,
 '이름 오타 수정 요청','rejected','확인 결과 변경 사유가 확인되지 않아 반려합니다. 필요 시 다시 요청해 주세요.',now()-interval '4 hours'),
-- completed · 직무 고글 추가 반영(→ +20000 추가입금 발생, SCT-00005 due_amount). 요금연결 수정→추가결제 END 상태.
('a1000000-0000-4000-8000-000000000005','01011110005',
 '[{"target":"participant","participant_id":"aa000000-0000-4000-8000-000000000005","participant_name":"정하늘","field":"rental_goggle","label":"렌탈·고글","current":"false","requested":"true"}]'::jsonb,
 '고글도 추가로 대여할게요.','completed','고글 추가를 반영했습니다. 추가 요금 20,000원 입금 부탁드립니다.',now()-interval '6 hours');

-- 검증: SELECT status, count(*) FROM applications WHERE application_no LIKE 'S%-27-%' GROUP BY status;
--       SELECT origin, status, count(*) FROM refund_requests GROUP BY origin, status;
--       SELECT status, count(*) FROM modification_requests GROUP BY status;
