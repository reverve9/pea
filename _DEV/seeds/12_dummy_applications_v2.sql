-- 12_dummy_applications_v2.sql — 동반인 후속입력 체크리스트(_DEV/handoff/체크리스트.md) 검증용 더미.
-- 직무 5(SCT) + 자율 5(SFP), 스키·스노보드. 기존 더미(10_)를 삭제·초기화 후 재삽입.
-- 엣지 초점 = 자율 동반 슬롯의 미입력/부분입력/전원완료 + 보험 뒷자리 복호 + 직무 3필드 대조.
--
-- ⚠ birth_back_enc = 이 머신 로컬 APP_ENC_KEY(AES-256-GCM)로 실제 암호화한 값(복호 테스트 가능).
--    다른 환경(프로덕션/타 머신)에선 키가 달라 복호 실패 → 로컬 검증 전용.
-- ⚠ '입력완료' 판정 = participants.birth_front IS NOT NULL (ParticipantFillSlot 기준).
--    동반 빈 슬롯 = name '동반 N' + 전 필드 NULL(제출 시 자동 생성 형태).
-- 실행: Supabase SQL editor 에 이 파일 전체 1회. 재실행 안전(맨 위 DELETE).

-- ── 0) 기존 더미 삭제·초기화(참가자·요청은 FK CASCADE 로 정리) ──
DELETE FROM applications WHERE application_no LIKE 'PEA-%'
  OR application_no LIKE 'SCT-27-%' OR application_no LIKE 'SFP-27-%';

-- ══════════════════════════════════════════════════════════════════════════════
-- 1) 직무연수(jikmu) 5건 — 대표 1명. 후속입력 = 어드민 3필드(생년월일·성별·뒷자리) 대조.
--    엣지: [보험 O 복호] [보험 X] [뒷자리 미입력=admin이 채울 대상] [상태 paid/completed] [입금신고 일치/불일치]
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO applications (id, application_no, session_id, phone, applicant_name, payer_name, room_type, room_spec, total_amount, status, deposit_confirmed_at, special_notes, referral_source, privacy_agreed, privacy_agreed_at, marketing_opt_in, payment_claimed_at, payment_claim_name, created_at) VALUES
-- 보험 O(뒷자리 암호문), 개별객실, 렌탈 부분
('a0000000-0000-4000-8000-000000000001','SCT-27-00001',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110001','김민준',NULL,'private',NULL,353000,'pending',NULL,'무릎 보호대 착용 예정',ARRAY['체육교육회 홈페이지'],true,now(),true,NULL,NULL,now()-interval '10 hours'),
-- 보험 X(뒷자리 NULL), 단체객실, 렌탈 없음, 입금신고 일치(본인명)
('a0000000-0000-4000-8000-000000000002','SCT-27-00002',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110002','이서연',NULL,'group',NULL,303000,'pending',NULL,NULL,ARRAY['학교 내 공문'],true,now(),false,now()-interval '2 hours','이서연',now()-interval '9 hours'),
-- 뒷자리 미입력(보험 원하나 admin 아직 안 채움) + 입금신고 불일치(payer 박도윤부 ≠ 신고명 박도윤), 렌탈 풀
('a0000000-0000-4000-8000-000000000003','SCT-27-00003',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110003','박도윤','박도윤부','private',NULL,388000,'pending',NULL,'단체 강습 조 편성 문의',ARRAY['교육청 연수원 게시글','지인 소개'],true,now(),true,now()-interval '1 hours','박도윤',now()-interval '8 hours'),
-- 보험 O, 상태 paid(입금확인됨)
('a0000000-0000-4000-8000-000000000004','SCT-27-00004',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110004','최지우',NULL,'group',NULL,338000,'paid',now()-interval '5 hours',NULL,ARRAY['과거 참가자'],true,now(),false,NULL,NULL,now()-interval '7 hours'),
-- 보험 O, 상태 completed(종료)
('a0000000-0000-4000-8000-000000000005','SCT-27-00005',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110005','정하은',NULL,'group',NULL,303000,'completed',now()-interval '20 hours',NULL,ARRAY['체육교육회 홈페이지'],true,now(),true,NULL,NULL,now()-interval '30 hours');

INSERT INTO participants (application_id, name, gender, phone, lesson_level, rentals, birth_front, birth_back_enc, is_leader, sort_order, line_amount) VALUES
('a0000000-0000-4000-8000-000000000001','김민준','male','01011110001','ski_beginner','{"apparel":true,"apparel_size":"L","goggle":true,"protector":false,"glove":false}'::jsonb,'900101','v1:0c248f6a2d5a4fa48401f785:4de1827f5b973c6e9a8b2dbaa184e991:dbcd6c64ab59a1',true,0,353000),
('a0000000-0000-4000-8000-000000000002','이서연','female','01011110002','board_basic','{"apparel":false,"apparel_size":null,"goggle":false,"protector":false,"glove":false}'::jsonb,'880202',NULL,true,0,303000),
('a0000000-0000-4000-8000-000000000003','박도윤','male','01011110003','ski_adv','{"apparel":true,"apparel_size":"XL","goggle":true,"protector":true,"glove":true}'::jsonb,'920303',NULL,true,0,388000),
('a0000000-0000-4000-8000-000000000004','최지우','female','01011110004','board_beginner','{"apparel":false,"apparel_size":null,"goggle":true,"protector":false,"glove":true}'::jsonb,'910404','v1:0d159306eb394be37633a7cf:835567882dee8b9950f1bb9756168a04:539a5d4dff9452',true,0,338000),
('a0000000-0000-4000-8000-000000000005','정하은','female','01011110005','ski_basic','{"apparel":false,"apparel_size":null,"goggle":false,"protector":false,"glove":false}'::jsonb,'950505','v1:84326dc28a2fceb4a5db1fb2:47ddb830dc6212c9c14b4d48400a2001:ad46d9787a6cbc',true,0,303000);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2) 자율패키지(jayul) 5건 — 대표 + 동반 빈 슬롯. 후속입력 = 마이 대신입력 / 셀프필 링크.
--    엣지: [1인 동반없음] [동반 전원 미입력] [부분입력=일부 완료/일부 미입력] [전원완료+보험혼재+복호다건] [완료상태인데 동반 미입력]
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO applications (id, application_no, session_id, phone, applicant_name, payer_name, pkg_size, total_amount, status, deposit_confirmed_at, companion_memo, special_notes, referral_source, privacy_agreed, privacy_agreed_at, marketing_opt_in, payment_claimed_at, payment_claim_name, created_at) VALUES
-- (1) 1인 — 동반 없음(후속입력 대상 0). 대표 보험 X.
('b0000000-0000-4000-8000-000000000001','SFP-27-00001',(SELECT id FROM sessions WHERE label='주중2박 1차수' LIMIT 1),'01022220001','강태호',NULL,1,437500,'pending',NULL,NULL,NULL,ARRAY['지인 소개'],true,now(),false,NULL,NULL,now()-interval '6 hours'),
-- (2) 3인 — 대표만 완료, 동반 2명 전원 미입력. 대표 보험희망(뒷자리 아직). 입금신고 일치.
('b0000000-0000-4000-8000-000000000002','SFP-27-00002',(SELECT id FROM sessions WHERE label='주중2박 2차수' LIMIT 1),'01022220002','윤서아',NULL,3,892500,'pending',NULL,'가족 동반 · 같은 방 배정 희망',NULL,ARRAY['체육교육회 홈페이지'],true,now(),true,now()-interval '3 hours','윤서아',now()-interval '5 hours'),
-- (3) 3인 — 부분입력: 동반1 입력완료(보험 뒷자리 O), 동반2 미입력. 상태 paid.
('b0000000-0000-4000-8000-000000000003','SFP-27-00003',(SELECT id FROM sessions WHERE label='주말2박 1차수' LIMIT 1),'01022220003','임준서',NULL,3,928000,'paid',now()-interval '4 hours','친구 2인 동반',NULL,ARRAY['과거 참가자'],true,now(),false,NULL,NULL,now()-interval '4 hours'),
-- (4) 5인 — 대표+동반4 전원 입력완료, 보험 혼재(뒷자리 복호 다건). 입금신고 불일치(payer 한지훈모 ≠ 신고명 한지훈).
('b0000000-0000-4000-8000-000000000004','SFP-27-00004',(SELECT id FROM sessions WHERE label='주말1박 1차수' LIMIT 1),'01022220004','한지훈','한지훈모',5,1045000,'pending',NULL,'가족 5인 · 리프트권 인원 확인 요망',NULL,ARRAY['학교 내 공문'],true,now(),false,now()-interval '30 minutes','한지훈',now()-interval '3 hours'),
-- (5) 4인 — 완료(completed) 상태인데 동반 3명 미입력(엣지). 대표 보험희망.
('b0000000-0000-4000-8000-000000000005','SFP-27-00005',(SELECT id FROM sessions WHERE label='주말2박 2차수' LIMIT 1),'01022220005','오예린',NULL,4,1156000,'completed',now()-interval '2 hours','동호회 4인',NULL,ARRAY['지인 소개'],true,now(),true,NULL,NULL,now()-interval '28 hours');

INSERT INTO participants (application_id, name, gender, phone, lesson_level, rentals, birth_front, birth_back_enc, is_leader, sort_order, line_amount) VALUES
-- SFP-00001 (1인)
('b0000000-0000-4000-8000-000000000001','강태호','male','01022220001','jayul_freeride','{"insurance_wanted":false,"equipment":null}'::jsonb,'950601',NULL,true,0,437500),
-- SFP-00002 (3인): 대표 완료 + 동반2 미입력
('b0000000-0000-4000-8000-000000000002','윤서아','female','01022220002','jayul_ski','{"insurance_wanted":true,"equipment":"ski"}'::jsonb,'930712',NULL,true,0,892500),
('b0000000-0000-4000-8000-000000000002','참가자 2',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,1,0),
('b0000000-0000-4000-8000-000000000002','참가자 3',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,2,0),
-- SFP-00003 (3인): 대표 완료 + 동반1 입력완료(보험 뒷자리) + 동반2 미입력
('b0000000-0000-4000-8000-000000000003','임준서','male','01022220003','jayul_board','{"insurance_wanted":false,"equipment":"board"}'::jsonb,'910820',NULL,true,0,928000),
('b0000000-0000-4000-8000-000000000003','임하람','female','01022220013','jayul_board','{"insurance_wanted":true,"equipment":"board","apparel_size":"M"}'::jsonb,'930615','v1:e923cd94c40e469a1e888f8d:cd387d75aaaf68999e5a84cdc2b88141:c9b302d6ac27d8',false,1,0),
('b0000000-0000-4000-8000-000000000003','참가자 3',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,2,0),
-- SFP-00004 (5인): 전원 입력완료 · 보험 혼재
('b0000000-0000-4000-8000-000000000004','한지훈','male','01022220004','jayul_ski','{"insurance_wanted":true,"equipment":"ski"}'::jsonb,'890905','v1:79ba712178b80130a08a3b39:821917e5406acb1e4245bca2279ab086:0c53d8a5e362a5',true,0,1045000),
('b0000000-0000-4000-8000-000000000004','한서준','male','01022220014','jayul_ski','{"insurance_wanted":true,"equipment":"ski","apparel_size":"M"}'::jsonb,'110228','v1:04e757ae5eae6407d2550c77:238a00d0bcc08952d379258c3c0e950d:2903503b1010bf',false,1,0),
('b0000000-0000-4000-8000-000000000004','한지아','female',NULL,'jayul_freeride','{"insurance_wanted":false,"equipment":null}'::jsonb,'130504',NULL,false,2,0),
('b0000000-0000-4000-8000-000000000004','한도경','female','01022220034','jayul_board','{"insurance_wanted":true,"equipment":"board","apparel_size":"L"}'::jsonb,'120810','v1:e3d4a84dafe534e1d76e90d3:3aa62e36f8811f7302710e053b672d8d:e28228611d27e8',false,3,0),
('b0000000-0000-4000-8000-000000000004','한나윤','female',NULL,'jayul_ski','{"insurance_wanted":false,"equipment":"ski","apparel_size":"S"}'::jsonb,'150922',NULL,false,4,0),
-- SFP-00005 (4인): 대표 완료 + 동반3 미입력
('b0000000-0000-4000-8000-000000000005','오예린','female','01022220005','jayul_ski','{"insurance_wanted":true,"equipment":"ski"}'::jsonb,'960118',NULL,true,0,1156000),
('b0000000-0000-4000-8000-000000000005','참가자 2',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,1,0),
('b0000000-0000-4000-8000-000000000005','참가자 3',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,2,0),
('b0000000-0000-4000-8000-000000000005','참가자 4',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,3,0);

-- ── 3) 카운터 정합 — 더미가 1~5번 점유, 다음 실제 발번은 6번부터 ──
INSERT INTO application_counters (prefix, year, last_seq) VALUES ('SCT', 2027, 5), ('SFP', 2027, 5)
ON CONFLICT (prefix, year) DO UPDATE SET last_seq = EXCLUDED.last_seq;
