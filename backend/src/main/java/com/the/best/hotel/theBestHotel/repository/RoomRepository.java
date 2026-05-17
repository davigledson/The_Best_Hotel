package com.the.best.hotel.theBestHotel.repository;

import com.the.best.hotel.theBestHotel.model.Room;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends MongoRepository<Room, ObjectId> {

    Optional<Room> findByNumber(String number);

    boolean existsByNumber(String number);

    List<Room> findByStatus(Room.Status status);
}