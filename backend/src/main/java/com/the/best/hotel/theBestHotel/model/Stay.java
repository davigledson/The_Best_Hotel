package com.the.best.hotel.theBestHotel.model;

import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "stays")
public class Stay {

    @Id
    @JsonSerialize(using = ToStringSerializer.class)
    private ObjectId id;

    @JsonSerialize(using = ToStringSerializer.class)
    private ObjectId bookingId;

    private LocalDateTime checkInAt;

    private LocalDateTime checkOutAt;

    @JsonSerialize(using = ToStringSerializer.class)
    private ObjectId checkInEmployeeId;

    @JsonSerialize(using = ToStringSerializer.class)
    private ObjectId checkOutEmployeeId;

    @JsonSerialize(using = ToStringSerializer.class)
    private ObjectId clientId;

    private List<Consumption> consumptions;

    private double totalDailies;

    private double totalConsumptions;

    private double grandTotal;

    private Status status;

    @Data
    public static class Consumption {
        private String id;
        private ObjectId productId;
        private String productName;
        private int quantity;
        private double unitPrice;
        private LocalDateTime registeredAt;
        private DeliveryStatus deliveryStatus;
        private String notes;
        private LocalDateTime completedAt;
    }

    public enum Status {
        ACTIVE, CLOSED
    }

    public enum DeliveryStatus {
        FOR_DELIVERY,
        FOR_PICKUP,
        AWAITING_CONFIRMATION,
        DELIVERED,
        CANCELLED
    }
}