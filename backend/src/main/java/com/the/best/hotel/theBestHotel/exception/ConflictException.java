package com.the.best.hotel.theBestHotel.exception;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

public class ConflictException extends RuntimeException {

    private final String type;
    private final List<ConflictDetail> conflicts;

    public ConflictException(String type, String message, List<ConflictDetail> conflicts) {
        super(message);
        this.type = type;
        this.conflicts = conflicts;
    }

    public String getType() {
        return type;
    }

    public List<ConflictDetail> getConflicts() {
        return conflicts;
    }

    @Data
    public static class ConflictDetail {
        private String bookingId;
        private LocalDate checkInDate;
        private LocalDate checkOutDate;
        private String roomNumbers;
        private String status;
    }
}