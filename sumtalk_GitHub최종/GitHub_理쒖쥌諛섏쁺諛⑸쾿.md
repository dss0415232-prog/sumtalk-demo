# GitHub 홈페이지 최종 반영 방법

이 압축에는 지금까지 만든 모든 기능이 들어 있습니다(단체 견적, 감면, 교통·지도 버튼, 여행 질문 등).

## 1. 홈페이지 파일 덮어쓰기 (GitHub)
1. GitHub 저장소(sumtalk-demo) → **Add file → Upload files**
2. `sumtalk_pages` 폴더 **안의 파일·폴더 전부**를 드래그해 올립니다. 같은 이름은 자동으로 교체됩니다.
3. ⚠ **`config.js`는 올리지 마세요.** 이 압축의 `config.js`는 빈 값이라, 올리면 저장소에 넣어 둔 중계 주소가 지워집니다. 업로드 목록에서 `config.js`를 빼거나, 올렸다면 저장소에서 `config.js`를 열어(연필 아이콘) 주소를 다시 넣으세요.
   - 아직 AI를 연결한 적이 없다면 `config.js`도 그대로 올려도 됩니다.
4. **Commit changes** → 1~2분 뒤 홈페이지에서 `Ctrl+F5`.

## 2. Cloudflare 중계 코드 교체 (AI를 쓸 때)
이번 버전은 관광 일정뿐 아니라 **주변 질문·교통 안내**도 AI를 씁니다. 중계 코드를 새 것으로 바꿔야 합니다.
1. Cloudflare → Workers & Pages → `sumtalk-llm` → **Edit code**
2. 기존 코드를 모두 지우고 `cloudflare/worker.js` 내용을 붙여넣은 뒤 **Deploy**
3. **Settings → Variables and Secrets**를 BizRouter에 맞게 확인
   - `OPENAI_API_KEY` (Secret): 받은 BizRouter 키
   - `UPSTREAM_URL`: `https://api.bizrouter.ai/v1/chat/completions`
   - `MODEL`: 시험에서 통과한 ID (예: `openai/gpt-4.1-mini`)
   - `ALLOW_ORIGIN`: `https://dss0415232-prog.github.io`
4. `config.js`의 `window.SUMTALK_LLM_PROXY`에 Worker 주소가 들어 있는지 확인

## 3. 확인
- 홈페이지에서 "교통"을 눌러 보세요(AI 없이도 안내와 버튼이 나옵니다).
- "영주 맛집 알려줘", "주변 관광 추천"으로 AI 연결을 확인하세요.

## 한도·주의
- 한 화면(새로고침 전)에서 AI 호출은 8회까지, 하루 전체 150회, 한 사람 시간당 8회까지입니다(초과 시 안내 문구).
- 접수·대화 기록은 새로고침하면 사라지고, 이메일은 실제 발송되지 않습니다(발송함 기록만).
- Public 저장소는 누구나 볼 수 있습니다. 공개 안내자료와 모의데이터만 들어 있는지 확인하세요.
