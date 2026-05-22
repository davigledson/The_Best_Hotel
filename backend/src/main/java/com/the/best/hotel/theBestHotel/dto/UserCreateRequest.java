package com.the.best.hotel.theBestHotel.dto;

import com.the.best.hotel.theBestHotel.model.User;
import lombok.Data;

@Data
public class UserCreateRequest {
    private String email;
    private String password;
    private User.Role role;

    private String employeeName;
    private String employeeCpf;
    private String employeePhone;

    private String clientName;
    private String clientCpf;
    private String clientEmail;
    private String clientPhone;
    private String clientAddress;
}
