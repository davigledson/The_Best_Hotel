package com.the.best.hotel.theBestHotel.model;


import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

@Data
@Document(collection = "employees")
public class Employee {

    @Id
    private ObjectId id;

    private String name;

    @Indexed(unique = true)
    private String cpf;

    private String phone;
}
