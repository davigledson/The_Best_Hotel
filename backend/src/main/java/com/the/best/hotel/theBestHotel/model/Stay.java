package com.the.best.hotel.theBestHotel.model;

import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "stays")
public class Stay {

    @Id
    private ObjectId id;

    private ObjectId bookingId;

    private LocalDateTime checkInAt;

    private LocalDateTime checkOutAt;

    private ObjectId checkInEmployeeId;

    private ObjectId checkOutEmployeeId;

    private List<Consumption> consumptions;

    private double totalDailies;

    private double totalConsumptions;

    private double grandTotal;

    private Status status;

    @Data
    public static class Consumption {
        private ObjectId productId;
        private String productName;
        private int quantity;
        private double unitPrice;
        private LocalDateTime registeredAt;
    }

    public enum Status {
        ACTIVE, CLOSED
    }
}