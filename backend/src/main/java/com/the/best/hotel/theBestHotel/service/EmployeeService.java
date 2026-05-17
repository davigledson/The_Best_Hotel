package com.the.best.hotel.theBestHotel.service;

import com.the.best.hotel.theBestHotel.model.Employee;
import com.the.best.hotel.theBestHotel.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;

    public List<Employee> findAll() {
        return employeeRepository.findAll();
    }

    public Employee findById(ObjectId id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    public Employee create(Employee employee) {
        if (employeeRepository.existsByCpf(employee.getCpf())) {
            throw new RuntimeException("CPF already in use");
        }
        return employeeRepository.save(employee);
    }

    public Employee update(ObjectId id, Employee updated) {
        Employee existing = findById(id);
        existing.setName(updated.getName());
        existing.setPhone(updated.getPhone());
        return employeeRepository.save(existing);
    }

    public void delete(ObjectId id) {
        employeeRepository.deleteById(id);
    }
}