package com.vivace.backend;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
@RequestMapping("/api/jobs")
public class JobController {

    private final JobStore jobStore;
    private final JobService jobService;

    public JobController(JobStore jobStore, JobService jobService) {
        this.jobStore = jobStore;
        this.jobService = jobService;
    }

    @PostMapping
    public Map<String, Object> createJob(@RequestParam("file") MultipartFile file) throws IOException {
        String jobId = UUID.randomUUID().toString();
        String originalFilename = file.getOriginalFilename();
        byte[] fileBytes = file.getBytes();

        TranscriptionJob job = new TranscriptionJob(
                jobId,
                originalFilename,
                "QUEUED",
                0
        );

        jobStore.save(job);

        jobService.processJob(jobId, originalFilename, fileBytes);

        return Map.of(
                "jobId", jobId,
                "status", job.getStatus(),
                "progress", job.getProgress()
        );
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<TranscriptionJob> getJob(@PathVariable String jobId) {
        TranscriptionJob job = jobStore.get(jobId);

        if (job == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(job);
    }

    @PostMapping("/{jobId}/progress")
    public ResponseEntity<Void> updateProgress(
            @PathVariable String jobId,
            @RequestBody ProgressRequest request
    ) {
        TranscriptionJob job = jobStore.get(jobId);

        if (job == null) {
            return ResponseEntity.notFound().build();
        }

        job.setProgress(request.getProgress());

        if (request.getStatus() != null) {
            job.setStatus(request.getStatus());
        }

        jobStore.save(job);
        return ResponseEntity.ok().build();
    }
}