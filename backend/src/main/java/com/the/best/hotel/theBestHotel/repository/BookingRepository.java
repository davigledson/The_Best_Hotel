package com.the.best.hotel.theBestHotel.repository;

import com.the.best.hotel.theBestHotel.model.Booking;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface BookingRepository extends MongoRepository<Booking, ObjectId> {

    List<Booking> findByStatus(Booking.Status status);

    @Query("{ 'rooms.roomId': ?0, 'status': { $nin: ?1 } }")
    List<Booking> findByRoomsRoomIdAndStatusNotIn(ObjectId roomId, List<Booking.Status> statuses);

    @Query("{ 'rooms.roomId': ?0, 'status': ?1 }")
    List<Booking> findByRoomsRoomIdAndStatusEquals(ObjectId roomId, Booking.Status status);

    @Query("{ 'guests.clientId': ?0, 'status': { $in: ?1 }, 'checkOutDate': { $gt: ?2 }, 'checkInDate': { $lt: ?3 } }")
    List<Booking> findByGuestsClientIdAndStatusInAndDateOverlap(ObjectId clientId, List<Booking.Status> statuses, LocalDate checkIn, LocalDate checkOut);

    List<Booking> findByCheckInDateBetween(LocalDate start, LocalDate end);

    List<Booking> findByGuestsClientId(ObjectId clientId);
}