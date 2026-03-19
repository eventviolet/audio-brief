package com.vivace.backend;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class JobStore {

    private final Map<String, TranscriptionJob> jobs = new ConcurrentHashMap<>();

    public void save(TranscriptionJob job) {
        jobs.put(job.getJobId(), job);
    }

    public TranscriptionJob get(String jobId) {
        return jobs.get(jobId);
    }
}