package com.the.best.hotel.theBestHotel.repository;

import com.the.best.hotel.theBestHotel.model.Employee;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface EmployeeRepository extends MongoRepository<Employee, ObjectId> {

    Optional<Employee> findByCpf(String cpf);

    boolean existsByCpf(String cpf);
}