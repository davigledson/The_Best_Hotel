package com.the.best.hotel.theBestHotel.model;

import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

@Data
@Document(collection = "rooms")
public class Room {

    @Id
    @JsonSerialize(using = ToStringSerializer.class)
    private ObjectId id;

    @Indexed(unique = true)
    private String number;

    private String type;

    private String description;

    private int capacity;

    private double dailyRate;

    private Status status;

    public enum Status {
        AVAILABLE, RESERVED, OCCUPIED, MAINTENANCE
    }
}