package com.the.best.hotel.theBestHotel.controller;

import com.the.best.hotel.theBestHotel.model.Room;
import com.the.best.hotel.theBestHotel.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @GetMapping
    public ResponseEntity<List<Room>> findAll() {
        return ResponseEntity.ok(roomService.findAll());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Room>> findByStatus(@PathVariable Room.Status status) {
        return ResponseEntity.ok(roomService.findByStatus(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Room> findById(@PathVariable String id) {
        return ResponseEntity.ok(roomService.findById(new ObjectId(id)));
    }

    @PostMapping
    public ResponseEntity<Room> create(@RequestBody Room room) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roomService.create(room));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Room> update(@PathVariable String id, @RequestBody Room room) {
        return ResponseEntity.ok(roomService.update(new ObjectId(id), room));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        roomService.delete(new ObjectId(id));
        return ResponseEntity.noContent().build();
    }
}