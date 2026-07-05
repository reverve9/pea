-- 10_dummy_applications.sql — 어드민 확인용 더미 신청 10건(직무 5 + 자율 5, 스키·스노보드).
-- 다양한 경우의 수: 상태(pending/paid/completed)·입금확인요청(미신고/신고 일치/신고 불일치)·
--   강습(스키·보드 × 입문/초급/중상급)·렌탈(없음/부분/풀)·보험(O 실암호문/X)·객실(단체/개별)·인원(1~5).
-- ⚠ 프리론치 테스트용. 실오픈 전 이 파일 재실행(맨 위 DELETE) 또는 수동 삭제로 정리.
-- birth_back_enc = 로컬 APP_ENC_KEY 로 실제 AES-256-GCM 암호화한 값(복호 테스트 가능).
--   다른 환경(프로덕션)에선 키가 달라 복호 실패 → 이 시드는 로컬 검증 전용.

-- ── 0) 기존 테스트/더미 제거(참가자·요청은 FK로 정리) ──
DELETE FROM applications WHERE application_no LIKE 'PEA-%'
  OR application_no LIKE 'SCT-27-%' OR application_no LIKE 'SFP-27-%';

-- ── 1) 직무연수(jikmu) 5건 — 직무 1차수, 참가자 1명(대표) ──
INSERT INTO applications (id, application_no, session_id, phone, applicant_name, payer_name, room_type, room_spec, total_amount, status, deposit_confirmed_at, special_notes, referral_source, privacy_agreed, privacy_agreed_at, marketing_opt_in, payment_claimed_at, payment_claim_name, created_at) VALUES
('a0000000-0000-0000-0000-000000000001','SCT-27-00001',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110001','김민준',NULL,'private',NULL,353000,'pending',NULL,'무릎 보호대 착용 예정',ARRAY['체육교육회 홈페이지'],true,now(),true,NULL,NULL,now()-interval '10 hours'),
('a0000000-0000-0000-0000-000000000002','SCT-27-00002',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110002','이서연',NULL,'group',NULL,303000,'pending',NULL,NULL,ARRAY['학교 내 공문'],true,now(),false,now()-interval '2 hours','이서연',now()-interval '9 hours'),
('a0000000-0000-0000-0000-000000000003','SCT-27-00003',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110003','박도윤','박도윤부','private',NULL,383000,'pending',NULL,'단체 강습 조 편성 문의',ARRAY['교육청 연수원 게시글','지인 소개'],true,now(),true,now()-interval '1 hours','박도윤부',now()-interval '8 hours'),
('a0000000-0000-0000-0000-000000000004','SCT-27-00004',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110004','최지우',NULL,'group',NULL,323000,'paid',now()-interval '5 hours',NULL,ARRAY['과거 참가자'],true,now(),false,NULL,NULL,now()-interval '7 hours'),
('a0000000-0000-0000-0000-000000000005','SCT-27-00005',(SELECT id FROM sessions WHERE label='직무 1차수' LIMIT 1),'01011110005','정하은',NULL,'group',NULL,303000,'completed',now()-interval '20 hours',NULL,ARRAY['체육교육회 홈페이지'],true,now(),true,NULL,NULL,now()-interval '30 hours');

INSERT INTO participants (application_id, name, gender, phone, lesson_level, rentals, birth_front, birth_back_enc, is_leader, sort_order, line_amount) VALUES
('a0000000-0000-0000-0000-000000000001','김민준','male','01011110001','ski_beginner','{"apparel":true,"apparel_size":"L","goggle":true,"protector":false,"glove":false}'::jsonb,'900101','v1:bb31b1d4290d87cf1dca6252:8067a70ff1aa96378c3e591c866d1ba2:c1e3d9c62033a3',true,0,353000),
('a0000000-0000-0000-0000-000000000002','이서연','female','01011110002','board_basic','{"apparel":false,"apparel_size":null,"goggle":false,"protector":false,"glove":false}'::jsonb,'880202',NULL,true,0,303000),
('a0000000-0000-0000-0000-000000000003','박도윤','male','01011110003','ski_adv','{"apparel":true,"apparel_size":"XL","goggle":true,"protector":true,"glove":true}'::jsonb,'920303','v1:6e592ef6cf63c23dba91d09f:dac3f830d3c8605e2db10627af790010:b421385e2203d7',true,0,383000),
('a0000000-0000-0000-0000-000000000004','최지우','female','01011110004','board_beginner','{"apparel":false,"apparel_size":null,"goggle":true,"protector":false,"glove":true}'::jsonb,'910404',NULL,true,0,323000),
('a0000000-0000-0000-0000-000000000005','정하은','female','01011110005','ski_basic','{"apparel":false,"apparel_size":null,"goggle":false,"protector":false,"glove":false}'::jsonb,'950505','v1:26c24e8b69c857beae9efeb3:bc6b1c66cebc9112b2804ae430b5b875:4656abb991d8f7',true,0,303000);

-- ── 2) 자율패키지(jayul) 5건 — 여러 차수, 대표 + 동반(insurance_wanted 플래그) ──
INSERT INTO applications (id, application_no, session_id, phone, applicant_name, payer_name, pkg_size, total_amount, status, deposit_confirmed_at, companion_memo, special_notes, referral_source, privacy_agreed, privacy_agreed_at, marketing_opt_in, payment_claimed_at, payment_claim_name, created_at) VALUES
('b0000000-0000-0000-0000-000000000001','SFP-27-00001',(SELECT id FROM sessions WHERE label='주중2박 1차수' LIMIT 1),'01022220001','강태호',NULL,1,437500,'pending',NULL,NULL,NULL,ARRAY['지인 소개'],true,now(),false,NULL,NULL,now()-interval '6 hours'),
('b0000000-0000-0000-0000-000000000002','SFP-27-00002',(SELECT id FROM sessions WHERE label='주중2박 2차수' LIMIT 1),'01022220002','윤서아',NULL,3,892500,'pending',NULL,'가족 동반 · 같은 방 배정 희망',NULL,ARRAY['체육교육회 홈페이지'],true,now(),true,now()-interval '3 hours','윤서아',now()-interval '5 hours'),
('b0000000-0000-0000-0000-000000000003','SFP-27-00003',(SELECT id FROM sessions WHERE label='주말2박 1차수' LIMIT 1),'01022220003','임준서',NULL,2,700000,'paid',now()-interval '4 hours','친구와 2인 신청',NULL,ARRAY['과거 참가자'],true,now(),false,NULL,NULL,now()-interval '4 hours'),
('b0000000-0000-0000-0000-000000000004','SFP-27-00004',(SELECT id FROM sessions WHERE label='주말1박 1차수' LIMIT 1),'01022220004','한지훈','한지훈모',5,1000000,'pending',NULL,'가족 5인 · 리프트권 인원 확인 요망',NULL,ARRAY['학교 내 공문'],true,now(),false,now()-interval '30 minutes','한지훈모',now()-interval '3 hours'),
('b0000000-0000-0000-0000-000000000005','SFP-27-00005',(SELECT id FROM sessions WHERE label='주말2박 2차수' LIMIT 1),'01022220005','오예린',NULL,4,1156000,'completed',now()-interval '2 hours','동호회 4인',NULL,ARRAY['지인 소개'],true,now(),true,NULL,NULL,now()-interval '28 hours');

-- 자율 참가자(대표 + 동반)
INSERT INTO participants (application_id, name, gender, phone, lesson_level, rentals, birth_front, birth_back_enc, is_leader, sort_order, line_amount) VALUES
-- SFP-00001 (1인)
('b0000000-0000-0000-0000-000000000001','강태호','male','01022220001',NULL,'{"insurance_wanted":false}'::jsonb,'950601',NULL,true,0,437500),
-- SFP-00002 (3인)
('b0000000-0000-0000-0000-000000000002','윤서아','female','01022220002',NULL,'{"insurance_wanted":true}'::jsonb,'930712',NULL,true,0,892500),
('b0000000-0000-0000-0000-000000000002','윤가온',NULL,'01022220012',NULL,'{"insurance_wanted":true}'::jsonb,NULL,NULL,false,1,0),
('b0000000-0000-0000-0000-000000000002','윤라온',NULL,NULL,NULL,'{"insurance_wanted":false}'::jsonb,NULL,NULL,false,2,0),
-- SFP-00003 (2인)
('b0000000-0000-0000-0000-000000000003','임준서','male','01022220003',NULL,'{"insurance_wanted":false}'::jsonb,'910820',NULL,true,0,700000),
('b0000000-0000-0000-0000-000000000003','임하람',NULL,NULL,NULL,'{"insurance_wanted":false}'::jsonb,NULL,NULL,false,1,0),
-- SFP-00004 (5인)
('b0000000-0000-0000-0000-000000000004','한지훈','male','01022220004',NULL,'{"insurance_wanted":true}'::jsonb,'890905',NULL,true,0,1000000),
('b0000000-0000-0000-0000-000000000004','한서준',NULL,'01022220014',NULL,'{"insurance_wanted":true}'::jsonb,NULL,NULL,false,1,0),
('b0000000-0000-0000-0000-000000000004','한지아',NULL,NULL,NULL,'{"insurance_wanted":false}'::jsonb,NULL,NULL,false,2,0),
('b0000000-0000-0000-0000-000000000004','한도경',NULL,NULL,NULL,'{"insurance_wanted":true}'::jsonb,NULL,NULL,false,3,0),
('b0000000-0000-0000-0000-000000000004','한나윤',NULL,NULL,NULL,'{"insurance_wanted":false}'::jsonb,NULL,NULL,false,4,0),
-- SFP-00005 (4인)
('b0000000-0000-0000-0000-000000000005','오예린','female','01022220005',NULL,'{"insurance_wanted":true}'::jsonb,'960118',NULL,true,0,1156000),
('b0000000-0000-0000-0000-000000000005','오시온',NULL,'01022220015',NULL,'{"insurance_wanted":true}'::jsonb,NULL,NULL,false,1,0),
('b0000000-0000-0000-0000-000000000005','오하린',NULL,NULL,NULL,'{"insurance_wanted":true}'::jsonb,NULL,NULL,false,2,0),
('b0000000-0000-0000-0000-000000000005','오리안',NULL,NULL,NULL,'{"insurance_wanted":false}'::jsonb,NULL,NULL,false,3,0);

-- ── 3) 카운터 정합 — 더미가 1~5번 점유했으니 다음 실제 발번은 6번부터 ──
INSERT INTO application_counters (prefix, year, last_seq) VALUES ('SCT', 2027, 5), ('SFP', 2027, 5)
ON CONFLICT (prefix, year) DO UPDATE SET last_seq = EXCLUDED.last_seq;
