package com.vivace.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class JobService {

    private final JobStore jobStore;
    private final SummaryService summaryService;

    @Value("${stt.server.url}")
    private String sttServerUrl;

    public JobService(JobStore jobStore, SummaryService summaryService) {
        this.jobStore = jobStore;
        this.summaryService = summaryService;
    }

    @Async
    public void processJob(String jobId, String originalFilename, byte[] fileBytes) {
        System.out.println("NEW BYTE[] VERSION RUNNING");
        TranscriptionJob job = jobStore.get(jobId);

        if (job == null) {
            return;
        }

        try {
            job.setStatus("TRANSCRIBING");
            job.setProgress(10);
            jobStore.save(job);

            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(10_000);
            factory.setReadTimeout(0);

            RestTemplate restTemplate = new RestTemplate(factory);

            ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return originalFilename;
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", fileResource);
            body.add("jobId", jobId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity =
                    new HttpEntity<>(body, headers);

            String url = sttServerUrl + "/transcribe";

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    Map.class
            );

            job.setProgress(80);
            jobStore.save(job);

            Map responseBody = response.getBody();
            String transcription = responseBody == null ? "" : (String) responseBody.get("text");
            job.setTranscription(transcription);
            jobStore.save(job);

            job.setStatus("SUMMARIZING");
            job.setProgress(90);
            jobStore.save(job);

            String summary = summaryService.summarize(transcription);
            job.setSummary(summary);

            job.setStatus("COMPLETED");
            job.setProgress(100);
            jobStore.save(job);

        } catch (Exception e) {
            e.printStackTrace();
            job.setStatus("FAILED");
            job.setProgress(100);
            job.setErrorMessage(e.getMessage());
            jobStore.save(job);
        }
    }
}