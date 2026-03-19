package com.vivace.backend;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class SummaryController {

    private final SummaryService summaryService;

    public SummaryController(SummaryService summaryService) {
        this.summaryService = summaryService;
    }

    @PostMapping("/api/summarize")
    public Map<String, String> summarize(@RequestBody Map<String, String> request) {
        String text = request.get("text");
        return Map.of("summary", summaryService.summarize(text));
    }
}