package com.the.best.hotel.theBestHotel.service;

import com.the.best.hotel.theBestHotel.model.Employee;
import com.the.best.hotel.theBestHotel.model.User;
import com.the.best.hotel.theBestHotel.repository.EmployeeRepository;
import com.the.best.hotel.theBestHotel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;

    public List<Employee> findAll() {
        return employeeRepository.findAll();
    }

    public Employee findById(ObjectId id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    public Employee create(Employee employee) {
        if (employeeRepository.existsByCpf(employee.getCpf())) {
            throw new RuntimeException("CPF já está em uso");
        }
        ObjectId userId = employee.getUserId();
        if (userId == null) {
            throw new RuntimeException("userId is required to create an employee");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getRole() != User.Role.EMPLOYEE) {
            throw new RuntimeException("User must have EMPLOYEE role");
        }
        if (user.getRefId() != null) {
            throw new RuntimeException("Usuário já vinculado a outro funcionário");
        }
        employee = employeeRepository.save(employee);
        user.setRefId(employee.getId());
        userRepository.save(user);
        return employee;
    }

    public Employee update(ObjectId id, Employee updated) {
        Employee existing = findById(id);
        existing.setName(updated.getName());
        existing.setPhone(updated.getPhone());
        return employeeRepository.save(existing);
    }

    public void delete(ObjectId id) {
        Employee employee = findById(id);
        ObjectId userId = employee.getUserId();
        if (userId != null) {
            userRepository.findById(userId).ifPresent(user -> {
                user.setRefId(null);
                userRepository.save(user);
            });
        }
        employeeRepository.deleteById(id);
    }
}