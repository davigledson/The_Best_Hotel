package com.the.best.hotel.theBestHotel.controller;

import com.the.best.hotel.theBestHotel.model.Employee;
import com.the.best.hotel.theBestHotel.service.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    public ResponseEntity<List<Employee>> findAll() {
        return ResponseEntity.ok(employeeService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> findById(@PathVariable String id) {
        return ResponseEntity.ok(employeeService.findById(new ObjectId(id)));
    }

    @PostMapping
    public ResponseEntity<Employee> create(@RequestBody Employee employee) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.create(employee));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Employee> update(@PathVariable String id, @RequestBody Employee employee) {
        return ResponseEntity.ok(employeeService.update(new ObjectId(id), employee));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        employeeService.delete(new ObjectId(id));
        return ResponseEntity.noContent().build();
    }
}