package com.the.best.hotel.theBestHotel.service;

import com.the.best.hotel.theBestHotel.dto.UserCreateRequest;
import com.the.best.hotel.theBestHotel.model.Client;
import com.the.best.hotel.theBestHotel.model.Employee;
import com.the.best.hotel.theBestHotel.model.User;
import com.the.best.hotel.theBestHotel.repository.ClientRepository;
import com.the.best.hotel.theBestHotel.repository.EmployeeRepository;
import com.the.best.hotel.theBestHotel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmployeeRepository employeeRepository;
    private final ClientRepository clientRepository;

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public User findById(ObjectId id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional
    public User create(UserCreateRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("Email já está em uso");
        }

        User user = new User();
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setRole(req.getRole());
        user = userRepository.save(user);

        switch (req.getRole()) {
            case EMPLOYEE -> {
                if (req.getEmployeeName() == null || req.getEmployeeName().isBlank()) {
                    throw new RuntimeException("Employee name is required");
                }
                if (req.getEmployeeCpf() == null || req.getEmployeeCpf().isBlank()) {
                    throw new RuntimeException("Employee CPF is required");
                }
                Employee emp = new Employee();
                emp.setName(req.getEmployeeName());
                emp.setCpf(req.getEmployeeCpf());
                emp.setPhone(req.getEmployeePhone());
                emp.setUserId(user.getId());
                emp = employeeRepository.save(emp);
                user.setRefId(emp.getId());
                userRepository.save(user);
            }
            case CLIENT -> {
                if (req.getClientName() == null || req.getClientName().isBlank()) {
                    throw new RuntimeException("Client name is required");
                }
                if (req.getClientCpf() == null || req.getClientCpf().isBlank()) {
                    throw new RuntimeException("Client CPF is required");
                }
                Client cli = new Client();
                cli.setName(req.getClientName());
                cli.setCpf(req.getClientCpf());
                cli.setEmail(req.getClientEmail() != null ? req.getClientEmail() : req.getEmail());
                cli.setPhone(req.getClientPhone());
                cli.setAddress(req.getClientAddress());
                cli.setUserId(user.getId());
                cli = clientRepository.save(cli);
                user.setRefId(cli.getId());
                userRepository.save(user);
            }
            case ADMIN -> {
                // no linked entity needed
            }
        }

        return user;
    }

    public User update(ObjectId id, User updated) {
        User existing = findById(id);
        existing.setEmail(updated.getEmail());
        existing.setRole(updated.getRole());
        if (updated.getPassword() != null && !updated.getPassword().isBlank()) {
            existing.setPassword(passwordEncoder.encode(updated.getPassword()));
        }
        return userRepository.save(existing);
    }

    @Transactional
    public void delete(ObjectId id) {
        User user = findById(id);
        ObjectId refId = user.getRefId();
        if (refId != null) {
            switch (user.getRole()) {
                case EMPLOYEE -> employeeRepository.findById(refId).ifPresent(emp -> {
                    employeeRepository.delete(emp);
                });
                case CLIENT -> clientRepository.findById(refId).ifPresent(cli -> {
                    clientRepository.delete(cli);
                });
            }
        }
        userRepository.deleteById(id);
    }
}

