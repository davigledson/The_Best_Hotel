package com.the.best.hotel.theBestHotel.model;

import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

@Data
@Document(collection = "users")
public class User {

    @Id
    @JsonSerialize(using = ToStringSerializer.class)
    private ObjectId id;

    @Indexed(unique = true)
    private String email;

    private String password;

    private Role role;

    private ObjectId refId;

    public enum Role {
        ADMIN, RECEPTIONIST, EMPLOYEE, CLIENT
    }
}
