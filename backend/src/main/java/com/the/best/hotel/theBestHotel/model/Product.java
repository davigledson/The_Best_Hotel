package com.the.best.hotel.theBestHotel.model;

import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

@Data
@Document(collection = "products")
public class Product {

    @Id
    @JsonSerialize(using = ToStringSerializer.class)
    private ObjectId id;

    private String name;

    private String category;

    private double price;

    private boolean active;
}