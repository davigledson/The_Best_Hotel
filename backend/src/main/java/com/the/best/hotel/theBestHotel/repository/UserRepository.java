package com.the.best.hotel.theBestHotel.repository;

import com.the.best.hotel.theBestHotel.model.User;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, ObjectId> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
