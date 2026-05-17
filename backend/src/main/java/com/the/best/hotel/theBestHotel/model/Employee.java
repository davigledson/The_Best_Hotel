package com.the.best.hotel.theBestHotel.model;


import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

@Data
@Document(collection = "employees")
public class Employee {

    @Id
    @JsonSerialize(using = ToStringSerializer.class)
    private ObjectId id;

    private String name;

    @Indexed(unique = true)
    private String cpf;

    private String phone;
}
