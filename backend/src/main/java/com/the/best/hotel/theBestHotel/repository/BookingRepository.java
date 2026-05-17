package com.the.best.hotel.theBestHotel.repository;

import com.the.best.hotel.theBestHotel.model.Booking;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface BookingRepository extends MongoRepository<Booking, ObjectId> {

    List<Booking> findByRoomId(ObjectId roomId);

    List<Booking> findByStatus(Booking.Status status);

    List<Booking> findByRoomIdAndStatusNotIn(ObjectId roomId, List<Booking.Status> statuses);

    List<Booking> findByCheckInDateBetween(LocalDate start, LocalDate end);
}