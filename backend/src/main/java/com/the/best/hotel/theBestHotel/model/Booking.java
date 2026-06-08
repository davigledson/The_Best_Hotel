package com.the.best.hotel.theBestHotel.model;

import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "bookings")
public class Booking {

    @Id
    @JsonSerialize(using = ToStringSerializer.class)
    private ObjectId id;

    private List<Guest> guests;

    private List<BookedRoom> rooms;

    private LocalDate checkInDate;

    private LocalDate checkOutDate;

    private double advancePayment;

    private Status status;

    private Cancellation cancellation;

    private LocalDateTime createdAt;

    private Boolean checkinRequested = false;

    @Data
    public static class BookedRoom {
        @JsonSerialize(using = ToStringSerializer.class)
        private ObjectId roomId;
        private double dailyRate;
        private int numberOfGuests = 1;
    }

    @Data
    public static class Guest {
        @JsonSerialize(using = ToStringSerializer.class)
        private ObjectId clientId;
        private boolean holder;
    }

    @Data
    public static class Cancellation {
        private LocalDateTime cancelledAt;
        private String reason;
        private double refundAmount;
    }

    public enum Status {
        PENDING, CONFIRMED, CANCELLED, CHECKIN, CHECKOUT
    }
}