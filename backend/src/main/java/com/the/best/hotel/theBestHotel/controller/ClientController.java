package com.the.best.hotel.theBestHotel.controller;

import com.the.best.hotel.theBestHotel.model.Client;
import com.the.best.hotel.theBestHotel.service.ClientService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;

    @GetMapping
    public ResponseEntity<List<Client>> findAll() {
        return ResponseEntity.ok(clientService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Client> findById(@PathVariable String id) {
        return ResponseEntity.ok(clientService.findById(new ObjectId(id)));
    }

    @PostMapping
    public ResponseEntity<Client> create(@RequestBody Client client) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clientService.create(client));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Client> update(@PathVariable String id, @RequestBody Client client) {
        return ResponseEntity.ok(clientService.update(new ObjectId(id), client));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        clientService.delete(new ObjectId(id));
        return ResponseEntity.noContent().build();
    }
}