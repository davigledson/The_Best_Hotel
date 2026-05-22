package com.the.best.hotel.theBestHotel.controller;

import com.the.best.hotel.theBestHotel.dto.UserCreateRequest;
import com.the.best.hotel.theBestHotel.model.User;
import com.the.best.hotel.theBestHotel.security.JwtTokenProvider;
import com.the.best.hotel.theBestHotel.service.UserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        User user = userService.findByEmail(request.getEmail());

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid password");
        }

        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());

        return ResponseEntity.ok(new LoginResponse(
                token,
                user.getEmail(),
                user.getRole().name(),
                user.getRefId() != null ? user.getRefId().toHexString() : null
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        UserCreateRequest dto = new UserCreateRequest();
        dto.setEmail(request.getEmail());
        dto.setPassword(request.getPassword());
        dto.setRole(User.Role.CLIENT);
        dto.setClientName(request.getName());
        dto.setClientCpf(request.getCpf());
        dto.setClientPhone(request.getPhone());
        dto.setClientAddress(request.getAddress());

        User user = userService.create(dto);

        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());

        return ResponseEntity.status(HttpStatus.CREATED).body(new LoginResponse(
                token,
                user.getEmail(),
                user.getRole().name(),
                user.getRefId() != null ? user.getRefId().toHexString() : null
        ));
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Data
    public static class RegisterRequest {
        private String name;
        private String email;
        private String password;
        private String cpf;
        private String phone;
        private String address;
    }

    @Data
    @RequiredArgsConstructor
    public static class LoginResponse {
        private final String token;
        private final String email;
        private final String role;
        private final String refId;
    }
}
