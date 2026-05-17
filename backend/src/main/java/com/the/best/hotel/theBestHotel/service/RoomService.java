package com.the.best.hotel.theBestHotel.service;

import com.the.best.hotel.theBestHotel.model.Room;
import com.the.best.hotel.theBestHotel.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;

    public List<Room> findAll() {
        return roomRepository.findAll();
    }

    public List<Room> findByStatus(Room.Status status) {
        return roomRepository.findByStatus(status);
    }

    public Room findById(ObjectId id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found"));
    }

    public Room create(Room room) {
        if (roomRepository.existsByNumber(room.getNumber())) {
            throw new RuntimeException("Room number already exists");
        }
        room.setStatus(Room.Status.AVAILABLE);
        return roomRepository.save(room);
    }

    public Room update(ObjectId id, Room updated) {
        Room existing = findById(id);
        existing.setType(updated.getType());
        existing.setDescription(updated.getDescription());
        existing.setCapacity(updated.getCapacity());
        existing.setDailyRate(updated.getDailyRate());
        existing.setStatus(updated.getStatus());
        return roomRepository.save(existing);
    }

    public void delete(ObjectId id) {
        roomRepository.deleteById(id);
    }
}