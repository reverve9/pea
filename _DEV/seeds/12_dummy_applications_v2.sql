-- 12_dummy_applications_v2.sql — 렌탈 개편(5유형·사이즈·대표배정) 검증용 더미. 직무 3(SCT) + 자율 7(SFP).
-- 기존 더미 전체 삭제 후 재삽입. 재실행 안전(맨 위 DELETE). Supabase SQL editor 에 파일 전체 1회.
--
-- 렌탈 모델([[rental-model]]): 용품세트(equipment 무료) + 의류/보호대/고글/장갑.
--   직무 = 신청폼에서 옵션 on/off + 사이즈 확정(participants.rentals 에 apparel/protector/goggle/glove + *_size).
--   자율 = 최초신청 수량만(applications.price_breakdown.meta.rental_qty) → 대표가 마이 매트릭스에서 참가자별 배정.
--         participants.rentals 옵션 플래그 = 대표 배정 결과. 사이즈(=참가자 입력) 없으면 null.
-- ⚠ birth_back_enc = 이 머신 로컬 APP_ENC_KEY(AES-256-GCM)로 실제 암호화 → 이 머신에서만 복호 성공(로컬 QA 전용).
--   괄호 안 = 복호 시 나오는 평문 뒷자리(검증용): 김민준3011111·임하람4022222·한지훈1033333·한서준3044444·한도경4055555·신재원1066666·배소율2077777
-- ⚠ '입력완료' 판정 = participants.birth_front IS NOT NULL. 빈 슬롯 = '참가자 N' + 전 필드 NULL.

-- ── 0) 기존 더미 삭제(참가자·요청은 FK CASCADE) ──
DELETE FROM applications WHERE application_no LIKE 'PEA-%'
  OR application_no LIKE 'SCT-27-%' OR application_no LIKE 'SFP-27-%';

-- ══════════════════════════════════════════════════════════════════════════════
-- 1) 직무연수(jikmu) 3건 — 대표 1인. 옵션·사이즈는 신청폼 확정.
--    엣지: [보험O 복호+풀렌탈 사이즈전종] [보험X·고글만(사이즈없는옵션)] [보험희망·뒷자리 미입력=admin보정+completed]
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO applications (id, application_no, session_id, phone, applicant_name, payer_name, room_type, room_spec, total_amount, status, deposit_confirmed_at, special_notes, referral_source, privacy_agreed, privacy_agreed_at, marketing_opt_in, payment_claimed_at, payment_claim_name, created_at) VALUES
-- (1) 보험O(복호), 개별객실, 풀렌탈+사이즈 전종. 입금신고 일치.
('a0000000-0000-4000-8000-000000000001','SCT-27-00001',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110001','김민준',NULL,'private',NULL,438000,'pending',NULL,'풀렌탈 신청',ARRAY['체육교육회 홈페이지'],true,now(),true,now()-interval '2 hours','김민준',now()-interval '10 hours'),
-- (2) 보험X, 렌탈=고글만(사이즈 없는 옵션). 단체객실, paid.
('a0000000-0000-4000-8000-000000000002','SCT-27-00002',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110002','이서연',NULL,'group',NULL,323000,'paid',now()-interval '5 hours',NULL,ARRAY['학교 내 공문'],true,now(),false,NULL,NULL,now()-interval '9 hours'),
-- (3) 보험희망·뒷자리 미입력(admin이 채울 대상) + 렌탈 의류/보호대 사이즈. completed, 입금신고 불일치.
('a0000000-0000-4000-8000-000000000003','SCT-27-00003',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110003','박도윤','박도윤부','private',NULL,405000,'completed',now()-interval '20 hours','단체강습 조편성 문의',ARRAY['교육청 연수원 게시글','지인 소개'],true,now(),true,now()-interval '1 hours','박도윤',now()-interval '8 hours');

INSERT INTO participants (application_id, name, gender, phone, lesson_level, rentals, birth_front, birth_back_enc, is_leader, sort_order, line_amount) VALUES
('a0000000-0000-4000-8000-000000000001','김민준','male','01011110001','ski_beginner','{"apparel":true,"apparel_size":"L","protector":true,"protector_size":"L","goggle":true,"glove":true,"glove_size":"M"}'::jsonb,'900101','v1:3c8d0718420e7bcb72bfd75f:576096fb7f9491ef70f7e6f6e03514f0:3c45be61b722a2',true,0,438000),
('a0000000-0000-4000-8000-000000000002','이서연','female','01011110002','board_basic','{"apparel":false,"protector":false,"goggle":true,"glove":false}'::jsonb,'880202',NULL,true,0,323000),
('a0000000-0000-4000-8000-000000000003','박도윤','male','01011110003','ski_adv','{"apparel":true,"apparel_size":"XL","protector":true,"protector_size":"M","goggle":false,"glove":false,"insurance_wanted":true}'::jsonb,'920303',NULL,true,0,405000);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2) 자율패키지(jayul) 7건 — 대표 + 참가자 슬롯. price_breakdown.meta.rental_qty = 구매 수량.
--    엣지: [1인 렌탈X] [미배정 시작] [완전배정·부분입력] [전원완료·복호3건] [completed·미배정]
--          [과배정경계(남은0→칩비활성)] [렌탈0·보험만 배정]
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO applications (id, application_no, session_id, phone, applicant_name, payer_name, pkg_size, total_amount, price_breakdown, status, deposit_confirmed_at, companion_memo, special_notes, referral_source, privacy_agreed, privacy_agreed_at, marketing_opt_in, payment_claimed_at, payment_claim_name, created_at) VALUES
-- (1) 1인 — 렌탈 없음(매트릭스 미노출).
('b0000000-0000-4000-8000-000000000001','SFP-27-00001',(SELECT id FROM sessions WHERE label='주중2박 1차수' LIMIT 1),'01022220001','강태호',NULL,1,437500,'{"kind":"jayul","meta":{"rental_qty":{"apparel":0,"goggle":0,"protector":0,"glove":0}}}'::jsonb,'pending',NULL,NULL,NULL,ARRAY['지인 소개'],true,now(),false,NULL,NULL,now()-interval '6 hours'),
-- (2) 3인 — 의류2·고글1 구매, 미배정(대표 배정 시작). 동반 미입력. 입금신고 일치.
('b0000000-0000-4000-8000-000000000002','SFP-27-00002',(SELECT id FROM sessions WHERE label='주중2박 2차수' LIMIT 1),'01022220002','윤서아',NULL,3,892500,'{"kind":"jayul","meta":{"rental_qty":{"apparel":2,"goggle":1,"protector":0,"glove":0}}}'::jsonb,'pending',NULL,'가족 동반 · 같은 방 희망',NULL,ARRAY['체육교육회 홈페이지'],true,now(),true,now()-interval '3 hours','윤서아',now()-interval '5 hours'),
-- (3) 3인 — 의류2·보호대1·장갑1 완전배정. 대표=의류+장갑(사이즈 미입력), 동반1=의류+보호대+보험(완료), 동반2 미입력. paid.
('b0000000-0000-4000-8000-000000000003','SFP-27-00003',(SELECT id FROM sessions WHERE label='주말2박 1차수' LIMIT 1),'01022220003','임준서',NULL,3,928000,'{"kind":"jayul","meta":{"rental_qty":{"apparel":2,"goggle":0,"protector":1,"glove":1}}}'::jsonb,'paid',now()-interval '4 hours','친구 2인 동반',NULL,ARRAY['과거 참가자'],true,now(),false,NULL,NULL,now()-interval '4 hours'),
-- (4) 5인 — 의류3·보호대2·고글1·장갑1 전원 배정+사이즈완료. 보험 3건(복호). 입금신고 불일치.
('b0000000-0000-4000-8000-000000000004','SFP-27-00004',(SELECT id FROM sessions WHERE label='주말1박 1차수' LIMIT 1),'01022220004','한지훈','한지훈모',5,1045000,'{"kind":"jayul","meta":{"rental_qty":{"apparel":3,"goggle":1,"protector":2,"glove":1}}}'::jsonb,'pending',NULL,'가족 5인 · 리프트권 인원 확인',NULL,ARRAY['학교 내 공문'],true,now(),false,now()-interval '30 minutes','한지훈',now()-interval '3 hours'),
-- (5) 4인 — 의류1 구매·미배정. completed인데 동반 미입력(엣지).
('b0000000-0000-4000-8000-000000000005','SFP-27-00005',(SELECT id FROM sessions WHERE label='주말2박 2차수' LIMIT 1),'01022220005','오예린',NULL,4,1156000,'{"kind":"jayul","meta":{"rental_qty":{"apparel":1,"goggle":0,"protector":0,"glove":0}}}'::jsonb,'completed',now()-interval '2 hours','동호회 4인',NULL,ARRAY['지인 소개'],true,now(),true,NULL,NULL,now()-interval '28 hours'),
-- (6) 2인 — 의류1 구매, 대표만 배정(1/1 완전=남은0). 동반 슬롯 의류칩 비활성 검증. 대표 사이즈완료+보험. pending.
('b0000000-0000-4000-8000-000000000006','SFP-27-00006',(SELECT id FROM sessions WHERE label='주중2박 1차수' LIMIT 1),'01022220006','신재원',NULL,2,620000,'{"kind":"jayul","meta":{"rental_qty":{"apparel":1,"goggle":0,"protector":0,"glove":0}}}'::jsonb,'pending',NULL,'2인 동반',NULL,ARRAY['과거 참가자'],true,now(),false,NULL,NULL,now()-interval '2 hours'),
-- (7) 3인 — 렌탈 구매 없음. 대표가 보험만 배정(대표+동반1). 매트릭스 보험전용 노출 엣지. pending.
('b0000000-0000-4000-8000-000000000007','SFP-27-00007',(SELECT id FROM sessions WHERE label='주말2박 1차수' LIMIT 1),'01022220007','배소율',NULL,3,850000,'{"kind":"jayul","meta":{"rental_qty":{"apparel":0,"goggle":0,"protector":0,"glove":0}}}'::jsonb,'pending',NULL,'보험만 가입 희망',NULL,ARRAY['지인 소개'],true,now(),true,now()-interval '1 hours','배소율',now()-interval '1 hours');

INSERT INTO participants (application_id, name, gender, phone, lesson_level, rentals, birth_front, birth_back_enc, is_leader, sort_order, line_amount) VALUES
-- SFP-00001 (1인): 렌탈 없음
('b0000000-0000-4000-8000-000000000001','강태호','male','01022220001','jayul_freeride','{"insurance_wanted":false,"equipment":"ski","apparel":false,"protector":false,"goggle":false,"glove":false}'::jsonb,'950601',NULL,true,0,437500),
-- SFP-00002 (3인): 미배정 시작(대표 용품세트·보험희망만, 옵션 전부 false). 동반 미입력.
('b0000000-0000-4000-8000-000000000002','윤서아','female','01022220002','jayul_ski','{"insurance_wanted":true,"equipment":"ski","apparel":false,"protector":false,"goggle":false,"glove":false}'::jsonb,'930712',NULL,true,0,892500),
('b0000000-0000-4000-8000-000000000002','참가자 2',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,1,0),
('b0000000-0000-4000-8000-000000000002','참가자 3',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,2,0),
-- SFP-00003 (3인): 완전배정. 대표=의류+장갑(사이즈 null), 동반1=의류+보호대+보험(완료), 동반2 미입력.
('b0000000-0000-4000-8000-000000000003','임준서','male','01022220003','jayul_board','{"insurance_wanted":false,"equipment":"board","apparel":true,"apparel_size":null,"protector":false,"goggle":false,"glove":true,"glove_size":null}'::jsonb,'910820',NULL,true,0,928000),
('b0000000-0000-4000-8000-000000000003','임하람','female','01022220013','jayul_board','{"insurance_wanted":true,"equipment":"board","apparel":true,"apparel_size":"M","protector":true,"protector_size":"L","goggle":false,"glove":false}'::jsonb,'930615','v1:0fac796603f818b93da24404:90bcc2277e589f91c159a2590588d26f:3a2fbbc426d52a',false,1,0),
('b0000000-0000-4000-8000-000000000003','참가자 3',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,2,0),
-- SFP-00004 (5인): 전원 배정+사이즈 완료. 의류3(지훈·서준·도경)·보호대2(서준·도경)·고글1(지훈)·장갑1(지아). 보험 3건.
('b0000000-0000-4000-8000-000000000004','한지훈','male','01022220004','jayul_ski','{"insurance_wanted":true,"equipment":"ski","apparel":true,"apparel_size":"L","protector":false,"goggle":true,"glove":false}'::jsonb,'890905','v1:4263850b85726fa12c7fd91b:1fc1ec7a795d6de7b13ffdd094193bef:b0930dd4d40870',true,0,1045000),
('b0000000-0000-4000-8000-000000000004','한서준','male','01022220014','jayul_ski','{"insurance_wanted":true,"equipment":"ski","apparel":true,"apparel_size":"M","protector":true,"protector_size":"M","goggle":false,"glove":false}'::jsonb,'110228','v1:273e3b4e4712cb8355cc7b6b:de157d27dcd91a8a8f622c99fd5c5b5c:e76abee01bdbbf',false,1,0),
('b0000000-0000-4000-8000-000000000004','한지아','female',NULL,'jayul_freeride','{"insurance_wanted":false,"equipment":"ski","apparel":false,"protector":false,"goggle":false,"glove":true,"glove_size":"S"}'::jsonb,'130504',NULL,false,2,0),
('b0000000-0000-4000-8000-000000000004','한도경','female','01022220034','jayul_board','{"insurance_wanted":true,"equipment":"board","apparel":true,"apparel_size":"L","protector":true,"protector_size":"L","goggle":false,"glove":false}'::jsonb,'120810','v1:28fb714e7dd2ab66a6b6644b:a2a6f026a986392c738b4af05db7c6e7:9bd04595e6d005',false,3,0),
('b0000000-0000-4000-8000-000000000004','한나윤','female',NULL,'jayul_ski','{"insurance_wanted":false,"equipment":"ski","apparel":false,"protector":false,"goggle":false,"glove":false}'::jsonb,'150922',NULL,false,4,0),
-- SFP-00005 (4인): 의류1 미배정. completed·동반 미입력.
('b0000000-0000-4000-8000-000000000005','오예린','female','01022220005','jayul_ski','{"insurance_wanted":true,"equipment":"ski","apparel":false,"protector":false,"goggle":false,"glove":false}'::jsonb,'960118',NULL,true,0,1156000),
('b0000000-0000-4000-8000-000000000005','참가자 2',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,1,0),
('b0000000-0000-4000-8000-000000000005','참가자 3',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,2,0),
('b0000000-0000-4000-8000-000000000005','참가자 4',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,3,0),
-- SFP-00006 (2인): 의류1 대표만 배정(남은0). 동반 슬롯 의류칩 비활성 검증. 대표 사이즈완료+보험.
('b0000000-0000-4000-8000-000000000006','신재원','male','01022220006','jayul_ski','{"insurance_wanted":true,"equipment":"ski","apparel":true,"apparel_size":"L","protector":false,"goggle":false,"glove":false}'::jsonb,'940707','v1:1fa042e90e979b71206e9767:07191a6b086999760fe23cadfdb5908b:156f2ba53b1e48',true,0,620000),
('b0000000-0000-4000-8000-000000000006','참가자 2',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,1,0),
-- SFP-00007 (3인): 렌탈0·보험만 배정. 대표=보험(완료), 동반1=보험(미입력→뒷자리 대기), 동반2=미배정.
('b0000000-0000-4000-8000-000000000007','배소율','female','01022220007','jayul_ski','{"insurance_wanted":true,"equipment":"ski","apparel":false,"protector":false,"goggle":false,"glove":false}'::jsonb,'970303','v1:9aef42ec74be47057c188cb8:c509ebd57049aa5acea1ae43aaacc039:cd53369b6e8fc3',true,0,850000),
('b0000000-0000-4000-8000-000000000007','참가자 2',NULL,NULL,NULL,'{"insurance_wanted":true}'::jsonb,NULL,NULL,false,1,0),
('b0000000-0000-4000-8000-000000000007','참가자 3',NULL,NULL,NULL,'{}'::jsonb,NULL,NULL,false,2,0);

-- ── 3) 발번 카운터 정합(더미가 SCT 1~3·SFP 1~7 점유) ──
INSERT INTO application_counters (prefix, year, last_seq) VALUES ('SCT', 2027, 3), ('SFP', 2027, 7)
ON CONFLICT (prefix, year) DO UPDATE SET last_seq = EXCLUDED.last_seq;
