package com.vivace.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class SummaryService {

    private final String apiKey;
    private final RestTemplate restTemplate;

    public SummaryService(@Value("${openai.api-key:}") String apiKey) {
        this.apiKey = apiKey;
        this.restTemplate = new RestTemplate();
    }

    public String summarize(String text) {
        if (text == null || text.isBlank()) {
            return "요약할 텍스트가 없습니다.";
        }

        if (apiKey == null || apiKey.isBlank()) {
            return fallbackSummary(text);
        }

        try {
            String prompt = """
                    다음 텍스트를 한국어로 요약해 주세요.

                    조건:
                    1. 핵심 내용만 정리
                    2. 5줄 이내
                    3. 불필요한 반복 제거
                    4. 자연스러운 한국어로 작성

                    텍스트:
                    """ + text;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> body = Map.of(
                    "model", "gpt-4o-mini",
                    "messages", List.of(
                            Map.of("role", "user", "content", prompt)
                    )
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    "https://api.openai.com/v1/chat/completions",
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            Map responseBody = response.getBody();
            List choices = (List) responseBody.get("choices");
            Map firstChoice = (Map) choices.get(0);
            Map message = (Map) firstChoice.get("message");
            String summary = (String) message.get("content");

            return summary != null && !summary.isBlank() ? summary : fallbackSummary(text);

        } catch (Exception e) {
            e.printStackTrace();
            return fallbackSummary(text);
        }
    }

    private String fallbackSummary(String text) {
        String shortened = text.length() > 500
                ? text.substring(0, 500) + "..."
                : text;

        return """
                [임시 요약]
                AI 요약 호출에 실패하여 전사문 앞부분을 표시합니다.

                %s
                """.formatted(shortened);
    }
}