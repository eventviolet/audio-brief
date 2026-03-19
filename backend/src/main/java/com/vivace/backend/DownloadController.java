package com.vivace.backend;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class DownloadController {

    @PostMapping("/api/download/txt")
    public ResponseEntity<byte[]> downloadTxt(@RequestBody DownloadRequest request) {
        String fileName = buildTxtFileName(request.fileName(), request.sourceFileName());

        String content = """
                [Audio Brief 결과]

                [원본 파일명]
                %s

                [전사 결과]
                %s

                ----------------------------------------

                [요약 결과]
                %s
                """.formatted(
                safe(request.sourceFileName()),
                safe(request.transcription()),
                safe(request.summary())
        );

        byte[] fileBytes = content.getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileName + "\"")
                .header(HttpHeaders.CONTENT_TYPE, "text/plain; charset=UTF-8")
                .contentLength(fileBytes.length)
                .body(fileBytes);
    }

    private String buildTxtFileName(String requestedFileName, String sourceFileName) {
        if (requestedFileName != null && !requestedFileName.isBlank()) {
            return normalizeTxtName(requestedFileName);
        }

        if (sourceFileName != null && !sourceFileName.isBlank()) {
            int dotIndex = sourceFileName.lastIndexOf('.');
            String baseName = dotIndex > 0 ? sourceFileName.substring(0, dotIndex) : sourceFileName;
            return normalizeTxtName(baseName + ".txt");
        }

        return "audio-brief-result.txt";
    }

    private String normalizeTxtName(String fileName) {
        String sanitized = fileName.replaceAll("[\\\\/:*?\"<>|]", "_");
        if (!sanitized.toLowerCase().endsWith(".txt")) {
            sanitized += ".txt";
        }
        return sanitized;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    public record DownloadRequest(
            String fileName,
            String sourceFileName,
            String transcription,
            String summary
    ) {}
}