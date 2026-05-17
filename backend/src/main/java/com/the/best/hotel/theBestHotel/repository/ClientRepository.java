package com.the.best.hotel.theBestHotel.repository;

import com.the.best.hotel.theBestHotel.model.Client;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ClientRepository extends MongoRepository<Client, ObjectId> {

    Optional<Client> findByCpf(String cpf);

    Optional<Client> findByEmail(String email);

    boolean existsByCpf(String cpf);

    boolean existsByEmail(String email);
}
