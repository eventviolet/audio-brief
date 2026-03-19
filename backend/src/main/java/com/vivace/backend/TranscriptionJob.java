package com.vivace.backend;

public class TranscriptionJob {

    private String jobId;
    private String fileName;
    private String status;
    private int progress;
    private String transcription;
    private String summary;
    private String errorMessage;

    public TranscriptionJob() {
    }

    public TranscriptionJob(String jobId, String fileName, String status, int progress) {
        this.jobId = jobId;
        this.fileName = fileName;
        this.status = status;
        this.progress = progress;
    }

    public String getJobId() {
        return jobId;
    }

    public void setJobId(String jobId) {
        this.jobId = jobId;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getProgress() {
        return progress;
    }

    public void setProgress(int progress) {
        this.progress = progress;
    }

    public String getTranscription() {
        return transcription;
    }

    public void setTranscription(String transcription) {
        this.transcription = transcription;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}