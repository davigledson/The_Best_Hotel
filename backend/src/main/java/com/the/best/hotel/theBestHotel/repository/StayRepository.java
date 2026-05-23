package com.the.best.hotel.theBestHotel.repository;

import com.the.best.hotel.theBestHotel.model.Stay;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface StayRepository extends MongoRepository<Stay, ObjectId> {

    Optional<Stay> findByBookingId(ObjectId bookingId);

    List<Stay> findByStatus(Stay.Status status);

    List<Stay> findByClientId(ObjectId clientId);
}